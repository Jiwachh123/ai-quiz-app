import {
  Quiz,
  QuizAttempt,
  QuizAnalysis,
  Question,
  UserStats,
  Difficulty,
  ConfidenceLevel,
  ExamMode,
  AdaptiveDecisionLogEntry,
  RevisionCard,
  StudyPlan,
  LeaderboardEntry,
  WeeklyProgressPoint,
} from "@/types";
import { getUsers } from "@/lib/auth";
import { v4 as uuidv4 } from "uuid";

const QUIZZES_KEY = "ai_quiz_quizzes";
const ATTEMPTS_KEY = "ai_quiz_attempts";
const REVISION_KEY = "ai_quiz_revision_cards";
const STUDY_PLAN_KEY = "ai_quiz_study_plans";

const LEITNER_INTERVAL_DAYS: Record<number, number> = {
  1: 1,
  2: 3,
  3: 7,
  4: 14,
  5: 30,
};

export function getQuizzes(): Quiz[] {
  if (typeof window === "undefined") return [];
  const data = localStorage.getItem(QUIZZES_KEY);
  return data ? JSON.parse(data) : [];
}

export function saveQuiz(quiz: Quiz) {
  if (typeof window === "undefined") return;
  const quizzes = getQuizzes();
  const index = quizzes.findIndex((q) => q.id === quiz.id);
  if (index >= 0) {
    quizzes[index] = quiz;
  } else {
    quizzes.push(quiz);
  }
  localStorage.setItem(QUIZZES_KEY, JSON.stringify(quizzes));
}

export function getQuizById(id: string): Quiz | undefined {
  return getQuizzes().find((q) => q.id === id);
}

export function getQuizzesByUser(userId: string): Quiz[] {
  return getQuizzes()
    .filter((q) => q.createdBy === userId || q.isPublic)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export function getPublicQuizzes(): Quiz[] {
  return getQuizzes()
    .filter((q) => q.isPublic)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export function deleteQuiz(id: string) {
  if (typeof window === "undefined") return;
  const quizzes = getQuizzes().filter((q) => q.id !== id);
  localStorage.setItem(QUIZZES_KEY, JSON.stringify(quizzes));
}

export function updateQuestionInQuiz(
  quizId: string,
  questionId: string,
  updatedFields: Partial<Question>
) {
  if (typeof window === "undefined") return;
  const quizzes = getQuizzes();
  const quizIdx = quizzes.findIndex((q) => q.id === quizId);
  if (quizIdx >= 0) {
    quizzes[quizIdx].questions = quizzes[quizIdx].questions.map((q) =>
      q.id === questionId ? { ...q, ...updatedFields } : q
    );
    localStorage.setItem(QUIZZES_KEY, JSON.stringify(quizzes));
  }
}

export function buildQuizAnalysis(
  questions: Question[],
  answers: number[],
  mainTopic: string,
  options?: {
    questionTimes?: number[];
    totalTimeTaken?: number;
    decisionLog?: AdaptiveDecisionLogEntry[];
    aiPersonalizedFeedback?: string;
  }
): QuizAnalysis {
  const difficultyBreakdown: Record<Difficulty, { total: number; correct: number }> = {
    easy: { total: 0, correct: 0 },
    medium: { total: 0, correct: 0 },
    hard: { total: 0, correct: 0 },
    expert: { total: 0, correct: 0 },
  };
  const subtopicBreakdown: Record<string, { total: number; correct: number }> = {};

  let correctTotal = 0;

  questions.forEach((q, idx) => {
    const diff: Difficulty = (q.difficulty as Difficulty) || "medium";
    const sub = q.subtopic || q.topic || mainTopic;
    const isCorrect = answers[idx] === q.correctAnswer;

    if (isCorrect) correctTotal += 1;

    if (!difficultyBreakdown[diff]) {
      difficultyBreakdown[diff] = { total: 0, correct: 0 };
    }
    difficultyBreakdown[diff].total += 1;
    if (isCorrect) difficultyBreakdown[diff].correct += 1;

    if (!subtopicBreakdown[sub]) {
      subtopicBreakdown[sub] = { total: 0, correct: 0 };
    }
    subtopicBreakdown[sub].total += 1;
    if (isCorrect) subtopicBreakdown[sub].correct += 1;
  });

  const accuracy =
    questions.length > 0 ? Math.round((correctTotal / questions.length) * 100) : 0;

  // Time management stats
  const validTimes =
    options?.questionTimes && options.questionTimes.length > 0
      ? options.questionTimes.filter((t) => typeof t === "number" && t >= 0)
      : [];
  const totalSec =
    options?.totalTimeTaken ?? validTimes.reduce((acc, t) => acc + t, 0);
  const averageTimePerQuestion =
    questions.length > 0
      ? Math.round((totalSec / questions.length) * 10) / 10
      : 0;
  const fastestTimeSec = validTimes.length > 0 ? Math.min(...validTimes) : Math.max(1, Math.round(averageTimePerQuestion));
  const slowestTimeSec = validTimes.length > 0 ? Math.max(...validTimes) : Math.max(1, Math.round(averageTimePerQuestion));

  let timeManagementNote = "";
  if (averageTimePerQuestion <= 15 && accuracy >= 75) {
    timeManagementNote = `Excellent exam speed (${averageTimePerQuestion}s/question) with strong accuracy.`;
  } else if (averageTimePerQuestion <= 15 && accuracy < 65) {
    timeManagementNote = `You answered quickly (${averageTimePerQuestion}s/question) but accuracy dipped—slow down slightly to verify edge cases.`;
  } else if (averageTimePerQuestion <= 40) {
    timeManagementNote = `Balanced pacing (${averageTimePerQuestion}s/question), well suited for university exam conditions.`;
  } else {
    timeManagementNote = `Average time (${averageTimePerQuestion}s/question) is on the slower side—practice timed drills to improve speed.`;
  }

  const weakAreas: string[] = [];
  const strongAreas: string[] = [];

  Object.entries(subtopicBreakdown).forEach(([sub, stats]) => {
    const subAcc = stats.correct / stats.total;
    if (subAcc < 0.6) weakAreas.push(sub);
    else if (subAcc >= 0.8) strongAreas.push(sub);
  });

  if (weakAreas.length === 0 && accuracy < 70) {
    weakAreas.push(mainTopic);
  }

  let recommendation = "";
  if (accuracy >= 85) {
    recommendation = `Great mastery of ${mainTopic}! Push further with Hard-to-Expert adaptive sessions or timed practice.`;
  } else if (accuracy >= 60) {
    recommendation =
      weakAreas.length > 0
        ? `Solid effort! Prioritize Smart Revision and a targeted practice quiz on: ${weakAreas.join(", ")}.`
        : `Good progress on ${mainTopic}! Review missed explanations and reattempt to reach 85%+.`;
  } else {
    recommendation = `Focus on fundamentals in ${
      weakAreas.length > 0 ? weakAreas.join(", ") : mainTopic
    }. Your mistakes have been added to your Spaced Repetition Smart Revision deck.`;
  }

  return {
    accuracy,
    averageTimePerQuestion,
    fastestTimeSec,
    slowestTimeSec,
    timeManagementNote,
    difficultyBreakdown,
    subtopicBreakdown,
    weakAreas,
    strongAreas,
    recommendation,
    aiPersonalizedFeedback: options?.aiPersonalizedFeedback,
    decisionLog: options?.decisionLog || [],
  };
}

// Attempts
export function getAttempts(): QuizAttempt[] {
  if (typeof window === "undefined") return [];
  const data = localStorage.getItem(ATTEMPTS_KEY);
  return data ? JSON.parse(data) : [];
}

export function saveAttempt(attempt: QuizAttempt) {
  if (typeof window === "undefined") return;
  const attempts = getAttempts();
  const existingIdx = attempts.findIndex((a) => a.id === attempt.id);
  if (existingIdx >= 0) {
    attempts[existingIdx] = attempt;
  } else {
    attempts.push(attempt);
  }
  localStorage.setItem(ATTEMPTS_KEY, JSON.stringify(attempts));
}

export function updateAttemptFeedback(attemptId: string, aiFeedback: string) {
  if (typeof window === "undefined") return;
  const attempts = getAttempts();
  const idx = attempts.findIndex((a) => a.id === attemptId);
  if (idx >= 0) {
    attempts[idx].analysis = {
      ...attempts[idx].analysis,
      aiPersonalizedFeedback: aiFeedback,
    };
    localStorage.setItem(ATTEMPTS_KEY, JSON.stringify(attempts));
  }
}

export function getAttemptById(id: string): QuizAttempt | undefined {
  return getAttempts().find((a) => a.id === id);
}

export function getAttemptsByUser(userId: string): QuizAttempt[] {
  return getAttempts()
    .filter((a) => a.userId === userId)
    .sort((a, b) => new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime());
}

export function getAttemptsByQuiz(quizId: string, userId?: string): QuizAttempt[] {
  return getAttempts()
    .filter((a) => a.quizId === quizId && (!userId || a.userId === userId))
    .sort((a, b) => new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime());
}

// ============================================================================
// SMART REVISION SYSTEM (SPACED REPETITION - LEITNER BOXES)
// ============================================================================
export function getAllRevisionCards(): RevisionCard[] {
  if (typeof window === "undefined") return [];
  const data = localStorage.getItem(REVISION_KEY);
  return data ? JSON.parse(data) : [];
}

export function saveAllRevisionCards(cards: RevisionCard[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(REVISION_KEY, JSON.stringify(cards));
}

export function getRevisionCardsByUser(userId: string): RevisionCard[] {
  return getAllRevisionCards()
    .filter((c) => c.userId === userId)
    .sort((a, b) => new Date(a.nextReviewAt).getTime() - new Date(b.nextReviewAt).getTime());
}

export function getDueRevisionCards(userId: string): RevisionCard[] {
  const now = Date.now();
  return getRevisionCardsByUser(userId).filter(
    (c) => new Date(c.nextReviewAt).getTime() <= now
  );
}

export function syncAttemptMistakesToRevision(
  userId: string,
  questions: Question[],
  answers: number[],
  confidences?: ConfidenceLevel[]
) {
  if (typeof window === "undefined") return;
  const allCards = getAllRevisionCards();
  const nowIso = new Date().toISOString();

  questions.forEach((q, idx) => {
    const isWrong = answers[idx] !== q.correctAnswer;
    const isLowConf = confidences?.[idx] === "low";

    if (isWrong || isLowConf) {
      const existingIdx = allCards.findIndex(
        (c) =>
          c.userId === userId &&
          c.question.question.trim().toLowerCase() === q.question.trim().toLowerCase()
      );

      if (existingIdx >= 0) {
        allCards[existingIdx].box = 1;
        allCards[existingIdx].nextReviewAt = nowIso; // Due immediately for spaced repetition
        allCards[existingIdx].timesWrong += isWrong ? 1 : 0;
        allCards[existingIdx].question = q;
      } else {
        allCards.push({
          id: uuidv4(),
          userId,
          question: q,
          topic: q.topic || "General",
          subtopic: q.subtopic || q.topic || "General",
          box: 1,
          nextReviewAt: nowIso, // Due immediately so user can practice mistakes right away
          timesWrong: isWrong ? 1 : 0,
          timesCorrect: 0,
        });
      }
    }
  });

  saveAllRevisionCards(allCards);
}

export function recordRevisionReview(cardId: string, rememberedCorrectly: boolean): RevisionCard | null {
  const allCards = getAllRevisionCards();
  const idx = allCards.findIndex((c) => c.id === cardId);
  if (idx < 0) return null;

  const card = allCards[idx];
  const now = new Date();
  card.lastReviewedAt = now.toISOString();

  if (rememberedCorrectly) {
    card.timesCorrect += 1;
    card.box = Math.min(5, card.box + 1);
    const intervalDays = LEITNER_INTERVAL_DAYS[card.box] || 1;
    const nextDate = new Date(now.getTime() + intervalDays * 24 * 60 * 60 * 1000);
    card.nextReviewAt = nextDate.toISOString();
  } else {
    card.timesWrong += 1;
    card.box = 1;
    // Schedule again in 1 day (or keep due soon)
    const nextDate = new Date(now.getTime() + 1 * 24 * 60 * 60 * 1000);
    card.nextReviewAt = nextDate.toISOString();
  }

  allCards[idx] = card;
  saveAllRevisionCards(allCards);
  return card;
}

// ============================================================================
// AI 7-DAY STUDY PLAN PERSISTENCE
// ============================================================================
export function getStudyPlanByUser(userId: string): StudyPlan | null {
  if (typeof window === "undefined") return null;
  const data = localStorage.getItem(STUDY_PLAN_KEY);
  const plans: StudyPlan[] = data ? JSON.parse(data) : [];
  return plans.find((p) => p.userId === userId) || null;
}

export function saveStudyPlan(plan: StudyPlan) {
  if (typeof window === "undefined") return;
  const data = localStorage.getItem(STUDY_PLAN_KEY);
  const plans: StudyPlan[] = data ? JSON.parse(data) : [];
  const idx = plans.findIndex((p) => p.userId === plan.userId);
  if (idx >= 0) {
    plans[idx] = plan;
  } else {
    plans.push(plan);
  }
  localStorage.setItem(STUDY_PLAN_KEY, JSON.stringify(plans));
}

export function toggleStudyPlanDayComplete(userId: string, dayNumber: number): StudyPlan | null {
  const plan = getStudyPlanByUser(userId);
  if (!plan) return null;
  plan.days = plan.days.map((d) =>
    d.day === dayNumber ? { ...d, completed: !d.completed } : d
  );
  saveStudyPlan(plan);
  return plan;
}

// ============================================================================
// COMPREHENSIVE ANALYTICS & WEEKLY PROGRESS
// ============================================================================
function getWeekLabel(isoDate: string): string {
  const d = new Date(isoDate);
  const startOfWeek = new Date(d);
  startOfWeek.setDate(d.getDate() - d.getDay());
  return startOfWeek.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export function calculateUserStats(userId: string): UserStats {
  const attempts = getAttemptsByUser(userId); // newest first
  const chronological = [...attempts].reverse(); // oldest first

  const difficultyPerformance: Record<
    Difficulty,
    { total: number; correct: number; accuracy: number }
  > = {
    easy: { total: 0, correct: 0, accuracy: 0 },
    medium: { total: 0, correct: 0, accuracy: 0 },
    hard: { total: 0, correct: 0, accuracy: 0 },
    expert: { total: 0, correct: 0, accuracy: 0 },
  };

  const topicPerformance: Record<
    string,
    { attempted: number; correct: number; lastScore: number; accuracy: number }
  > = {};

  const weeklyMap: Record<string, { quizzes: number; totalScore: number; questions: number }> = {};

  let totalScore = 0;
  let bestScore = 0;
  let totalQuestionsAnswered = 0;
  let totalCorrectAnswers = 0;
  let totalTimeSeconds = 0;

  chronological.forEach((attempt) => {
    totalScore += attempt.score;
    if (attempt.score > bestScore) bestScore = attempt.score;
    totalQuestionsAnswered += attempt.totalQuestions || 0;
    totalCorrectAnswers += attempt.correctCount || 0;
    totalTimeSeconds += attempt.timeTaken || 0;

    // Weekly progress aggregation
    const wLabel = getWeekLabel(attempt.completedAt);
    if (!weeklyMap[wLabel]) {
      weeklyMap[wLabel] = { quizzes: 0, totalScore: 0, questions: 0 };
    }
    weeklyMap[wLabel].quizzes += 1;
    weeklyMap[wLabel].totalScore += attempt.score;
    weeklyMap[wLabel].questions += attempt.totalQuestions || 0;

    const quiz = getQuizById(attempt.quizId);
    const questions = attempt.questionsSnapshot || quiz?.questions || [];
    const fallbackTopic = attempt.topic || quiz?.topic || "General";

    questions.forEach((q, idx) => {
      const diff: Difficulty = (q.difficulty as Difficulty) || "medium";
      const isCorrect = attempt.answers[idx] === q.correctAnswer;

      if (!difficultyPerformance[diff]) {
        difficultyPerformance[diff] = { total: 0, correct: 0, accuracy: 0 };
      }
      difficultyPerformance[diff].total += 1;
      if (isCorrect) difficultyPerformance[diff].correct += 1;

      const topicKey = q.subtopic || q.topic || fallbackTopic;
      if (!topicPerformance[topicKey]) {
        topicPerformance[topicKey] = { attempted: 0, correct: 0, lastScore: attempt.score, accuracy: 0 };
      }
      topicPerformance[topicKey].attempted += 1;
      if (isCorrect) topicPerformance[topicKey].correct += 1;
      topicPerformance[topicKey].lastScore = attempt.score;
    });
  });

  // Finalize difficulty & topic accuracies
  (["easy", "medium", "hard", "expert"] as const).forEach((d) => {
    const entry = difficultyPerformance[d];
    entry.accuracy = entry.total > 0 ? Math.round((entry.correct / entry.total) * 100) : 0;
  });

  const weakTopicsSet = new Set<string>();
  const strongTopicsSet = new Set<string>();

  Object.entries(topicPerformance).forEach(([topic, stats]) => {
    stats.accuracy = stats.attempted > 0 ? Math.round((stats.correct / stats.attempted) * 100) : 0;
    if (stats.attempted > 0) {
      if (stats.accuracy < 65) weakTopicsSet.add(topic);
      else if (stats.accuracy >= 80) strongTopicsSet.add(topic);
    }
  });

  attempts.slice(0, 5).forEach((a) => {
    a.analysis?.weakAreas?.forEach((w) => {
      if (!strongTopicsSet.has(w)) weakTopicsSet.add(w);
    });
  });

  let improvementTrend = 0;
  if (chronological.length >= 2) {
    const mid = Math.floor(chronological.length / 2);
    const firstHalf = chronological.slice(0, mid);
    const secondHalf = chronological.slice(mid);
    const avgFirst = firstHalf.reduce((acc, a) => acc + a.score, 0) / firstHalf.length;
    const avgSecond = secondHalf.reduce((acc, a) => acc + a.score, 0) / secondHalf.length;
    improvementTrend = Math.round(avgSecond - avgFirst);
  }

  const trendStatus: "improving" | "steady" | "needs_focus" =
    improvementTrend >= 3 ? "improving" : improvementTrend <= -3 ? "needs_focus" : "steady";

  const weeklyProgress: WeeklyProgressPoint[] = Object.entries(weeklyMap).map(
    ([weekLabel, data]) => ({
      weekLabel,
      quizzes: data.quizzes,
      avgScore: Math.round(data.totalScore / data.quizzes),
      questions: data.questions,
    })
  );

  const scoreHistory = chronological.map((a) => ({
    attemptId: a.id,
    quizId: a.quizId,
    quizTitle: a.quizTitle || getQuizById(a.quizId)?.title || `${a.topic || "Adaptive"} Quiz`,
    topic: a.topic || getQuizById(a.quizId)?.topic || "General",
    examMode: a.examMode || "custom",
    score: a.score,
    date: a.completedAt,
  }));

  const overallAccuracy =
    totalQuestionsAnswered > 0
      ? Math.round((totalCorrectAnswers / totalQuestionsAnswered) * 100)
      : 0;

  const averageTimePerQuestion =
    totalQuestionsAnswered > 0
      ? Math.round((totalTimeSeconds / totalQuestionsAnswered) * 10) / 10
      : 0;

  return {
    userId,
    totalQuizzes: attempts.length,
    totalQuestionsAnswered,
    totalCorrectAnswers,
    overallAccuracy,
    averageScore: attempts.length > 0 ? Math.round(totalScore / attempts.length) : 0,
    bestScore,
    averageTimePerQuestion,
    improvementTrend,
    trendStatus,
    difficultyPerformance,
    topicPerformance,
    weakTopics: Array.from(weakTopicsSet),
    strongTopics: Array.from(strongTopicsSet),
    weeklyProgress,
    scoreHistory,
  };
}

export function saveCompletedAdaptiveQuizAndAttempt(params: {
  userId: string;
  title: string;
  description?: string;
  topic: string;
  examMode?: ExamMode;
  questions: Question[];
  answers: number[];
  questionTimes?: number[];
  confidences?: ConfidenceLevel[];
  decisionLog?: AdaptiveDecisionLogEntry[];
  timeTaken: number;
  existingQuizId?: string;
}): { quiz: Quiz; attempt: QuizAttempt } {
  const {
    userId,
    title,
    description,
    topic,
    examMode = "custom",
    questions,
    answers,
    questionTimes,
    confidences,
    decisionLog,
    timeTaken,
    existingQuizId,
  } = params;

  let quiz = existingQuizId ? getQuizById(existingQuizId) : undefined;

  if (!quiz) {
    quiz = {
      id: existingQuizId || uuidv4(),
      title: title.trim() || `${topic} Adaptive Quiz`,
      description:
        description?.trim() ||
        `Adaptive quiz on ${topic} (${questions.length} questions)`,
      topic,
      examMode,
      questions,
      createdBy: userId,
      createdAt: new Date().toISOString(),
      isPublic: true,
      isAdaptive: true,
    };
    saveQuiz(quiz);
  } else {
    quiz.questions = questions;
    saveQuiz(quiz);
  }

  const correctCount = questions.reduce(
    (acc, q, idx) => acc + (answers[idx] === q.correctAnswer ? 1 : 0),
    0
  );
  const score =
    questions.length > 0 ? Math.round((correctCount / questions.length) * 100) : 0;

  const analysis = buildQuizAnalysis(questions, answers, topic, {
    questionTimes,
    totalTimeTaken: timeTaken,
    decisionLog,
  });

  const attempt: QuizAttempt = {
    id: uuidv4(),
    quizId: quiz.id,
    quizTitle: quiz.title,
    topic: quiz.topic,
    examMode,
    userId,
    answers,
    questionTimes,
    confidences,
    score,
    totalQuestions: questions.length,
    correctCount,
    difficultyProgression: questions.map((q) => q.difficulty),
    completedAt: new Date().toISOString(),
    timeTaken,
    questionsSnapshot: questions,
    analysis,
  };

  saveAttempt(attempt);
  // Automatically sync wrong or low-confidence questions into Smart Revision Spaced Repetition deck
  syncAttemptMistakesToRevision(userId, questions, answers, confidences);

  return { quiz, attempt };
}

// ============================================================================
// LEADERBOARD AGGREGATION (Real Registered Users + Benchmark Peers)
// ============================================================================
const DIFF_RANK: Record<Difficulty, number> = {
  easy: 1,
  medium: 2,
  hard: 3,
  expert: 4,
};

export function getLeaderboard(
  currentUserId?: string,
  filterMode: "all" | ExamMode = "all"
): LeaderboardEntry[] {
  const users = getUsers();
  const allAttempts = getAttempts();

  const entries: LeaderboardEntry[] = [];

  users.forEach((u) => {
    const userAttempts = allAttempts.filter(
      (a) =>
        a.userId === u.id &&
        (filterMode === "all" || (a.examMode || "custom") === filterMode)
    );
    if (userAttempts.length === 0 && u.id !== currentUserId) return;

    const totalQuizzes = userAttempts.length;
    const totalQuestions = userAttempts.reduce((s, a) => s + (a.totalQuestions || 0), 0);
    const totalCorrect = userAttempts.reduce((s, a) => s + (a.correctCount || 0), 0);
    const overallAccuracy =
      totalQuestions > 0 ? Math.round((totalCorrect / totalQuestions) * 100) : 0;
    const averageScore =
      totalQuizzes > 0
        ? Math.round(userAttempts.reduce((s, a) => s + a.score, 0) / totalQuizzes)
        : 0;
    const bestScore =
      totalQuizzes > 0 ? Math.max(...userAttempts.map((a) => a.score)) : 0;

    let highestDifficulty: Difficulty = "easy";
    userAttempts.forEach((a) => {
      (a.difficultyProgression || []).forEach((d) => {
        if ((DIFF_RANK[d] || 1) > DIFF_RANK[highestDifficulty]) {
          highestDifficulty = d;
        }
      });
    });

    const points =
      totalCorrect * 15 +
      totalQuizzes * 25 +
      DIFF_RANK[highestDifficulty] * 30;

    entries.push({
      userId: u.id,
      name: u.name,
      totalQuizzes,
      totalQuestions,
      averageScore,
      bestScore,
      overallAccuracy,
      highestDifficulty,
      points,
      isCurrentUser: u.id === currentUserId,
    });
  });

  // Add realistic benchmark peers when local browser only has 1-2 users
  const benchmarks: LeaderboardEntry[] = [
    {
      userId: "bench-1",
      name: "Aarav Sharma",
      totalQuizzes: 14,
      totalQuestions: 140,
      averageScore: 88,
      bestScore: 100,
      overallAccuracy: 87,
      highestDifficulty: "expert",
      points: 2295,
      isBenchmark: true,
    },
    {
      userId: "bench-2",
      name: "Priya Kumari",
      totalQuizzes: 10,
      totalQuestions: 95,
      averageScore: 82,
      bestScore: 95,
      overallAccuracy: 81,
      highestDifficulty: "hard",
      points: 1495,
      isBenchmark: true,
    },
    {
      userId: "bench-3",
      name: "Rohan Verma",
      totalQuizzes: 6,
      totalQuestions: 60,
      averageScore: 74,
      bestScore: 90,
      overallAccuracy: 73,
      highestDifficulty: "hard",
      points: 900,
      isBenchmark: true,
    },
  ];

  const combined = [...entries, ...benchmarks];
  return combined.sort((a, b) => b.points - a.points);
}
