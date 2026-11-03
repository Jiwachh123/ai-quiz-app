export type UserRole = "student";

export interface User {
  id: string;
  name: string;
  email: string;
  password: string; // hashed in real app
  role: UserRole;
  createdAt: string;
}

export type Difficulty = "easy" | "medium" | "hard";

export interface QuestionVerification {
  isVerified: boolean;
  confidence: number; // 0 to 100
  originalAnswer?: number;
  correctedByAI?: boolean;
  verificationNote?: string;
}

export interface Question {
  id: string;
  question: string;
  options: string[];
  correctAnswer: number; // index (0-3)
  explanation: string;
  difficulty: Difficulty;
  topic?: string;
  subtopic?: string;
  verification?: QuestionVerification;
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
  isAdaptive?: boolean;
  timeLimit?: number; // minutes
}

export interface QuizAnalysis {
  accuracy: number;
  difficultyBreakdown: Record<Difficulty, { total: number; correct: number }>;
  subtopicBreakdown: Record<string, { total: number; correct: number }>;
  weakAreas: string[];
  strongAreas: string[];
  recommendation: string;
}

export interface QuizAttempt {
  id: string;
  quizId: string;
  quizTitle: string;
  topic: string;
  userId: string;
  answers: number[]; // selected option indexes
  score: number;
  totalQuestions: number;
  correctCount: number;
  difficultyProgression: Difficulty[];
  completedAt: string;
  timeTaken: number; // seconds
  questionsSnapshot: Question[]; // permanent snapshot of questions, options, correct answers & explanations
  analysis: QuizAnalysis;
}

export interface UserStats {
  userId: string;
  totalQuizzes: number;
  averageScore: number;
  bestScore: number;
  improvementTrend: number; // change between recent and earlier attempts
  topicPerformance: Record<string, { attempted: number; correct: number; lastScore: number }>;
  weakTopics: string[];
  strongTopics: string[];
  scoreHistory: {
    attemptId: string;
    quizId: string;
    quizTitle: string;
    topic: string;
    score: number;
    date: string;
  }[];
}
