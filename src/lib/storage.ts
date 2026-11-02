import { Quiz, QuizAttempt, UserStats } from "@/types";
import { v4 as uuidv4 } from "uuid";

const QUIZZES_KEY = "ai_quiz_quizzes";
const ATTEMPTS_KEY = "ai_quiz_attempts";

export function getQuizzes(): Quiz[] {
  if (typeof window === "undefined") return [];
  const data = localStorage.getItem(QUIZZES_KEY);
  return data ? JSON.parse(data) : [];
}

export function saveQuiz(quiz: Quiz) {
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
  return getQuizzes().filter((q) => q.createdBy === userId);
}

export function getPublicQuizzes(): Quiz[] {
  return getQuizzes().filter((q) => q.isPublic);
}

export function deleteQuiz(id: string) {
  const quizzes = getQuizzes().filter((q) => q.id !== id);
  localStorage.setItem(QUIZZES_KEY, JSON.stringify(quizzes));
}

// Attempts
export function getAttempts(): QuizAttempt[] {
  if (typeof window === "undefined") return [];
  const data = localStorage.getItem(ATTEMPTS_KEY);
  return data ? JSON.parse(data) : [];
}

export function saveAttempt(attempt: QuizAttempt) {
  const attempts = getAttempts();
  attempts.push(attempt);
  localStorage.setItem(ATTEMPTS_KEY, JSON.stringify(attempts));
}

export function getAttemptsByUser(userId: string): QuizAttempt[] {
  return getAttempts().filter((a) => a.userId === userId);
}

export function getAttemptsByQuiz(quizId: string): QuizAttempt[] {
  return getAttempts().filter((a) => a.quizId === quizId);
}

export function calculateUserStats(userId: string): UserStats {
  const attempts = getAttemptsByUser(userId);
  const topicPerformance: Record<string, { attempted: number; correct: number }> = {};

  let totalScore = 0;

  attempts.forEach((attempt) => {
    const quiz = getQuizById(attempt.quizId);
    if (!quiz) return;

    totalScore += attempt.score;

    quiz.questions.forEach((q, idx) => {
      const topic = q.topic || quiz.topic;
      if (!topicPerformance[topic]) {
        topicPerformance[topic] = { attempted: 0, correct: 0 };
      }
      topicPerformance[topic].attempted += 1;
      if (attempt.answers[idx] === q.correctAnswer) {
        topicPerformance[topic].correct += 1;
      }
    });
  });

  const weakTopics: string[] = [];
  const strongTopics: string[] = [];

  Object.entries(topicPerformance).forEach(([topic, stats]) => {
    const accuracy = stats.correct / stats.attempted;
    if (accuracy < 0.6) weakTopics.push(topic);
    if (accuracy >= 0.8) strongTopics.push(topic);
  });

  return {
    userId,
    totalQuizzes: attempts.length,
    averageScore: attempts.length > 0 ? Math.round(totalScore / attempts.length) : 0,
    topicPerformance,
    weakTopics,
    strongTopics,
  };
}

export function createQuiz(
  title: string,
  description: string,
  topic: string,
  questions: any[],
  createdBy: string,
  isPublic: boolean = true,
  timeLimit?: number
): Quiz {
  const quiz: Quiz = {
    id: uuidv4(),
    title,
    description,
    topic,
    questions,
    createdBy,
    createdAt: new Date().toISOString(),
    isPublic,
    timeLimit,
  };
  saveQuiz(quiz);
  return quiz;
}
