import {
  Quiz,
  QuizAttempt,
  QuizAnalysis,
  Question,
  UserStats,
  Difficulty,
} from "@/types";
import { v4 as uuidv4 } from "uuid";

const QUIZZES_KEY = "ai_quiz_quizzes";
const ATTEMPTS_KEY = "ai_quiz_attempts";

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
  mainTopic: string
): QuizAnalysis {
  const difficultyBreakdown: Record<Difficulty, { total: number; correct: number }> = {
    easy: { total: 0, correct: 0 },
    medium: { total: 0, correct: 0 },
    hard: { total: 0, correct: 0 },
  };
  const subtopicBreakdown: Record<string, { total: number; correct: number }> = {};

  let correctTotal = 0;

  questions.forEach((q, idx) => {
    const diff = q.difficulty || "medium";
    const sub = q.subtopic || q.topic || mainTopic;
    const isCorrect = answers[idx] === q.correctAnswer;

    if (isCorrect) correctTotal += 1;

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

  const weakAreas: string[] = [];
  const strongAreas: string[] = [];

  Object.entries(subtopicBreakdown).forEach(([sub, stats]) => {
    const subAcc = stats.correct / stats.total;
    if (subAcc < 0.6) weakAreas.push(sub);
    else if (subAcc >= 0.8) strongAreas.push(sub);
  });

  // Also check difficulty weaknesses if no specific subtopics failed
  if (weakAreas.length === 0 && accuracy < 70) {
    weakAreas.push(mainTopic);
  }

  let recommendation = "";
  if (accuracy >= 85) {
    recommendation = `Great mastery of ${mainTopic}! Challenge yourself with a Hard-level adaptive session or explore advanced subtopics.`;
  } else if (accuracy >= 60) {
    recommendation =
      weakAreas.length > 0
        ? `Solid effort! Focus your next practice quiz on: ${weakAreas.join(", ")} to boost your mastery above 85%.`
        : `Good progress on ${mainTopic}! Retake this quiz or generate a targeted weak-area quiz to solidify concepts.`;
  } else {
    recommendation = `We recommend reviewing the detailed answer explanations below and generating a Weak Areas Practice Quiz on ${
      weakAreas.length > 0 ? weakAreas.join(", ") : mainTopic
    }.`;
  }

  return {
    accuracy,
    difficultyBreakdown,
    subtopicBreakdown,
    weakAreas,
    strongAreas,
    recommendation,
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

export function calculateUserStats(userId: string): UserStats {
  const attempts = getAttemptsByUser(userId); // sorted newest first
  const chronological = [...attempts].reverse(); // oldest to newest

  const topicPerformance: Record<
    string,
    { attempted: number; correct: number; lastScore: number }
  > = {};

  let totalScore = 0;
  let bestScore = 0;

  chronological.forEach((attempt) => {
    totalScore += attempt.score;
    if (attempt.score > bestScore) bestScore = attempt.score;

    const quiz = getQuizById(attempt.quizId);
    const questions = attempt.questionsSnapshot || quiz?.questions || [];
    const fallbackTopic = attempt.topic || quiz?.topic || "General";

    if (!topicPerformance[fallbackTopic]) {
      topicPerformance[fallbackTopic] = { attempted: 0, correct: 0, lastScore: attempt.score };
    }
    topicPerformance[fallbackTopic].lastScore = attempt.score;

    questions.forEach((q, idx) => {
      const topicKey = q.subtopic || q.topic || fallbackTopic;
      if (!topicPerformance[topicKey]) {
        topicPerformance[topicKey] = { attempted: 0, correct: 0, lastScore: attempt.score };
      }
      topicPerformance[topicKey].attempted += 1;
      if (attempt.answers[idx] === q.correctAnswer) {
        topicPerformance[topicKey].correct += 1;
      }
      topicPerformance[topicKey].lastScore = attempt.score;
    });
  });

  const weakTopicsSet = new Set<string>();
  const strongTopicsSet = new Set<string>();

  Object.entries(topicPerformance).forEach(([topic, stats]) => {
    if (stats.attempted === 0) return;
    const accuracy = stats.correct / stats.attempted;
    if (accuracy < 0.65) weakTopicsSet.add(topic);
    else if (accuracy >= 0.8) strongTopicsSet.add(topic);
  });

  // Also include weakAreas recorded in recent attempt analyses
  attempts.slice(0, 5).forEach((a) => {
    a.analysis?.weakAreas?.forEach((w) => {
      if (!strongTopicsSet.has(w)) weakTopicsSet.add(w);
    });
  });

  let improvementTrend = 0;
  if (chronological.length >= 2) {
    const firstHalf = chronological.slice(0, Math.floor(chronological.length / 2));
    const secondHalf = chronological.slice(Math.floor(chronological.length / 2));
    const avgFirst =
      firstHalf.reduce((acc, a) => acc + a.score, 0) / firstHalf.length;
    const avgSecond =
      secondHalf.reduce((acc, a) => acc + a.score, 0) / secondHalf.length;
    improvementTrend = Math.round(avgSecond - avgFirst);
  }

  const scoreHistory = chronological.map((a) => ({
    attemptId: a.id,
    quizId: a.quizId,
    quizTitle: a.quizTitle || getQuizById(a.quizId)?.title || `${a.topic || "Adaptive"} Quiz`,
    topic: a.topic || getQuizById(a.quizId)?.topic || "General",
    score: a.score,
    date: a.completedAt,
  }));

  return {
    userId,
    totalQuizzes: attempts.length,
    averageScore: attempts.length > 0 ? Math.round(totalScore / attempts.length) : 0,
    bestScore,
    improvementTrend,
    topicPerformance,
    weakTopics: Array.from(weakTopicsSet),
    strongTopics: Array.from(strongTopicsSet),
    scoreHistory,
  };
}

export function saveCompletedAdaptiveQuizAndAttempt(params: {
  userId: string;
  title: string;
  description?: string;
  topic: string;
  questions: Question[];
  answers: number[];
  timeTaken: number;
  existingQuizId?: string;
}): { quiz: Quiz; attempt: QuizAttempt } {
  const {
    userId,
    title,
    description,
    topic,
    questions,
    answers,
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
        `AI-verified adaptive quiz on ${topic} (${questions.length} questions)`,
      topic,
      questions,
      createdBy: userId,
      createdAt: new Date().toISOString(),
      isPublic: true,
      isAdaptive: true,
    };
    saveQuiz(quiz);
  } else {
    // Update questions if needed so reattempts have latest verified questions
    quiz.questions = questions;
    saveQuiz(quiz);
  }

  const correctCount = questions.reduce(
    (acc, q, idx) => acc + (answers[idx] === q.correctAnswer ? 1 : 0),
    0
  );
  const score =
    questions.length > 0 ? Math.round((correctCount / questions.length) * 100) : 0;

  const analysis = buildQuizAnalysis(questions, answers, topic);

  const attempt: QuizAttempt = {
    id: uuidv4(),
    quizId: quiz.id,
    quizTitle: quiz.title,
    topic: quiz.topic,
    userId,
    answers,
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

  return { quiz, attempt };
}
