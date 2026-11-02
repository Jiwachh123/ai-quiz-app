export type UserRole = "student" | "teacher";

export interface User {
  id: string;
  name: string;
  email: string;
  password: string; // hashed in real app
  role: UserRole;
  createdAt: string;
}

export interface Question {
  id: string;
  question: string;
  options: string[];
  correctAnswer: number; // index
  explanation: string;
  difficulty: "easy" | "medium" | "hard";
  topic?: string;
}

export interface Quiz {
  id: string;
  title: string;
  description: string;
  topic: string;
  questions: Question[];
  createdBy: string; // userId
  createdAt: string;
  isPublic: boolean;
  timeLimit?: number; // minutes
}

export interface QuizAttempt {
  id: string;
  quizId: string;
  userId: string;
  answers: number[]; // selected option indexes
  score: number;
  totalQuestions: number;
  correctCount: number;
  difficultyProgression: ("easy" | "medium" | "hard")[];
  completedAt: string;
  timeTaken: number; // seconds
}

export interface UserStats {
  userId: string;
  totalQuizzes: number;
  averageScore: number;
  topicPerformance: Record<string, { attempted: number; correct: number }>;
  weakTopics: string[];
  strongTopics: string[];
}
