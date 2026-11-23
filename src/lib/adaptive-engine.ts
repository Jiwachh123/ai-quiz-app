import {
  Difficulty,
  ConfidenceLevel,
  AdaptiveDecisionLogEntry,
} from "@/types";

export const DIFFICULTY_LEVELS: Difficulty[] = [
  "easy",
  "medium",
  "hard",
  "expert",
];

export const DIFFICULTY_LABELS: Record<Difficulty, string> = {
  easy: "Easy",
  medium: "Medium",
  hard: "Hard",
  expert: "Expert",
};

export interface AnswerSignal {
  isCorrect: boolean;
  timeTakenSec: number;
  confidence: ConfidenceLevel;
  difficulty: Difficulty;
}

export interface AdaptiveDecisionResult {
  nextDifficulty: Difficulty;
  newCorrectStreak: number;
  newWrongStreak: number;
  logEntry: AdaptiveDecisionLogEntry;
}

/**
 * Smarter Adaptive Engine:
 * - 4 clearly capped difficulty levels: Easy -> Medium -> Hard -> Expert
 * - Evaluates both immediate streak/last-3 AND recent 6-9 question performance window
 * - Incorporates time-taken (pace) and user confidence as soft signals
 * - Logs every single difficulty decision in human-readable form for the Analysis page
 */
export function evaluateAdaptiveStep(params: {
  questionNumber: number;
  questionText: string;
  subtopic: string;
  currentDifficulty: Difficulty;
  isCorrect: boolean;
  timeTakenSec: number;
  confidence: ConfidenceLevel;
  correctStreak: number;
  wrongStreak: number;
  recentHistory: AnswerSignal[]; // all previous answers in session
}): AdaptiveDecisionResult {
  const {
    questionNumber,
    questionText,
    subtopic,
    currentDifficulty,
    isCorrect,
    timeTakenSec,
    confidence,
    recentHistory,
  } = params;

  const updatedHistory: AnswerSignal[] = [
    ...recentHistory,
    {
      isCorrect,
      timeTakenSec,
      confidence,
      difficulty: currentDifficulty,
    },
  ];

  // Track recent window of last 6-9 questions (up to 9)
  const windowSize = Math.min(9, updatedHistory.length);
  const recentWindow = updatedHistory.slice(-windowSize);
  const recentCorrect = recentWindow.filter((h) => h.isCorrect).length;
  const recentAccuracy = recentCorrect / recentWindow.length;

  // Short-term 3-question window for rapid responsiveness
  const last3 = updatedHistory.slice(-3);
  const last3Correct = last3.filter((h) => h.isCorrect).length;

  let newCorrectStreak = isCorrect ? params.correctStreak + 1 : 0;
  let newWrongStreak = isCorrect ? 0 : params.wrongStreak + 1;

  // Soft signals: Time-taken & Confidence
  // Ideal target pace per difficulty (seconds)
  const targetTimeMap: Record<Difficulty, number> = {
    easy: 20,
    medium: 30,
    hard: 45,
    expert: 60,
  };
  const targetSec = targetTimeMap[currentDifficulty];
  const isFast = timeTakenSec > 0 && timeTakenSec <= targetSec * 0.85;
  const isSlow = timeTakenSec > targetSec * 1.5;

  const currentIdx = DIFFICULTY_LEVELS.indexOf(currentDifficulty);
  let nextIdx = currentIdx;
  let actionReason = "";

  // Compute composite mastery score from streak + 6-9 window + soft signals
  if (isCorrect) {
    // Fast-track promotion: 2 correct in a row with High confidence or fast pace, OR >= 2/3 recent + strong 6-9 window (>= 70%)
    const strongShortTerm = newCorrectStreak >= 2 && (confidence === "high" || isFast);
    const strongThree = last3.length === 3 && last3Correct >= 2 && (recentAccuracy >= 0.67 || newCorrectStreak >= 2);
    const strongLongWindow = recentWindow.length >= 6 && recentAccuracy >= 0.75 && newCorrectStreak >= 1;

    if ((strongShortTerm || strongThree || strongLongWindow) && currentIdx < DIFFICULTY_LEVELS.length - 1) {
      nextIdx = Math.min(currentIdx + 1, DIFFICULTY_LEVELS.length - 1);
      const nextDiff = DIFFICULTY_LEVELS[nextIdx];
      const softNote =
        confidence === "high" && isFast
          ? `fast pace (${timeTakenSec}s) & High confidence`
          : confidence === "high"
          ? `High confidence (${timeTakenSec}s)`
          : isFast
          ? `quick response (${timeTakenSec}s)`
          : `steady accuracy (${recentCorrect}/${recentWindow.length} recent)`;

      actionReason = `User got ${last3Correct}/${last3.length} recent (${recentCorrect}/${recentWindow.length} in last ${recentWindow.length}, ${softNote}) → difficulty increased from ${DIFFICULTY_LABELS[currentDifficulty]} to ${DIFFICULTY_LABELS[nextDiff]}`;
      // Reset streak after stepping up so user earns the next tier
      newCorrectStreak = 0;
    } else if (currentIdx === DIFFICULTY_LEVELS.length - 1) {
      actionReason = `User answered correctly (${recentCorrect}/${recentWindow.length} recent, ${timeTakenSec}s, ${confidence} confidence) → maintained at maximum Expert level`;
    } else {
      const softHold =
        confidence === "low" || isSlow
          ? ` (soft signal: ${confidence} confidence, ${timeTakenSec}s pace)`
          : "";
      actionReason = `User answered correctly (${last3Correct}/${last3.length} recent, streak ${newCorrectStreak})${softHold} → difficulty maintained at ${DIFFICULTY_LABELS[currentDifficulty]}`;
    }
  } else {
    // Incorrect answer: Check wrong streak, low confidence, or weak 6-9 window
    const sharpDrop = newWrongStreak >= 2;
    const lowConfidenceStruggle = confidence === "low" && recentAccuracy <= 0.5 && recentWindow.length >= 2;
    const weakLongWindow = recentWindow.length >= 6 && recentAccuracy < 0.45;
    const weakThree = last3.length === 3 && last3Correct <= 1;

    if ((sharpDrop || lowConfidenceStruggle || weakLongWindow || weakThree) && currentIdx > 0) {
      nextIdx = Math.max(currentIdx - 1, 0);
      const nextDiff = DIFFICULTY_LEVELS[nextIdx];
      actionReason = `User got ${last3Correct}/${last3.length} recent (${recentCorrect}/${recentWindow.length} in last ${recentWindow.length}, Time: ${timeTakenSec}s, Confidence: ${confidence}) → difficulty decreased from ${DIFFICULTY_LABELS[currentDifficulty]} to ${DIFFICULTY_LABELS[nextDiff]}`;
      newWrongStreak = 0;
    } else if (currentIdx === 0) {
      actionReason = `User missed question (${recentCorrect}/${recentWindow.length} recent, ${timeTakenSec}s) → kept at base Easy level for reinforcement`;
    } else {
      actionReason = `User missed question (streak reset, ${recentCorrect}/${recentWindow.length} recent, ${timeTakenSec}s) → difficulty maintained at ${DIFFICULTY_LABELS[currentDifficulty]} for one more check`;
    }
  }

  const nextDifficulty = DIFFICULTY_LEVELS[nextIdx];

  return {
    nextDifficulty,
    newCorrectStreak,
    newWrongStreak,
    logEntry: {
      questionNumber,
      questionText,
      subtopic,
      previousDifficulty: currentDifficulty,
      nextDifficulty,
      isCorrect,
      timeTakenSec,
      confidence,
      recentWindowSummary: `${recentCorrect}/${recentWindow.length} recent`,
      reason: actionReason,
    },
  };
}
