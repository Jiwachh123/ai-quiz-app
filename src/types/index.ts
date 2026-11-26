export type UserRole = "student";

export interface User {
  id: string;
  name: string;
  email: string;
  password: string; // hashed in real app
  role: UserRole;
  createdAt: string;
}

export type Difficulty = "easy" | "medium" | "hard" | "expert";

export type ConfidenceLevel = "low" | "medium" | "high";

export type ExamMode = "custom" | "syllabus";

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

export interface AdaptiveDecisionLogEntry {
  questionNumber: number;
  questionText: string;
  subtopic: string;
  previousDifficulty: Difficulty;
  nextDifficulty: Difficulty;
  isCorrect: boolean;
  timeTakenSec: number;
  confidence: ConfidenceLevel;
  recentWindowSummary: string; // e.g. "2/3 recent" or "6/8 recent"
  reason: string; // e.g. "User got 2/3 recent (Time: 14s, Confidence: High) -> difficulty increased from Medium to Hard"
}

export interface Quiz {
  id: string;
  title: string;
  description: string;
  topic: string;
  examMode?: ExamMode;
  questions: Question[];
  createdBy: string; // userId
  createdAt: string;
  isPublic: boolean;
  isAdaptive?: boolean;
  timeLimit?: number; // minutes
}

export interface QuizAnalysis {
  accuracy: number;
  averageTimePerQuestion: number; // seconds
  fastestTimeSec: number;
  slowestTimeSec: number;
  timeManagementNote: string;
  difficultyBreakdown: Record<Difficulty, { total: number; correct: number }>;
  subtopicBreakdown: Record<string, { total: number; correct: number }>;
  weakAreas: string[];
  strongAreas: string[];
  recommendation: string;
  aiPersonalizedFeedback?: string;
  decisionLog?: AdaptiveDecisionLogEntry[];
}

export interface QuizAttempt {
  id: string;
  quizId: string;
  quizTitle: string;
  topic: string;
  examMode?: ExamMode;
  userId: string;
  answers: number[]; // selected option indexes, -1 = not attempted
  questionTimes?: number[]; // seconds per question
  confidences?: ConfidenceLevel[];
  score: number;
  totalQuestions: number;
  correctCount: number;
  difficultyProgression: Difficulty[];
  completedAt: string;
  timeTaken: number; // total seconds
  questionsSnapshot: Question[];
  analysis: QuizAnalysis;
}

export interface RevisionCard {
  id: string;
  userId: string;
  question: Question;
  topic: string;
  subtopic: string;
  box: number; // Leitner spaced repetition box: 1 (1d), 2 (3d), 3 (7d), 4 (14d), 5 (30d)
  nextReviewAt: string; // ISO date
  lastReviewedAt?: string;
  timesWrong: number;
  timesCorrect: number;
}

export interface StudyPlanDay {
  day: number;
  title: string;
  focusTopics: string[];
  tasks: string[];
  practiceQuizTopic: string;
  estimatedMinutes: number;
  completed?: boolean;
}

export interface StudyPlan {
  id: string;
  userId: string;
  createdAt: string;
  summary: string;
  targetExam: string;
  days: StudyPlanDay[];
}

export interface WeeklyProgressPoint {
  weekLabel: string;
  quizzes: number;
  avgScore: number;
  questions: number;
}

export interface UserStats {
  userId: string;
  totalQuizzes: number;
  totalQuestionsAnswered: number;
  totalCorrectAnswers: number;
  overallAccuracy: number;
  averageScore: number;
  bestScore: number;
  averageTimePerQuestion: number;
  improvementTrend: number;
  trendStatus: "improving" | "steady" | "needs_focus";
  difficultyPerformance: Record<Difficulty, { total: number; correct: number; accuracy: number }>;
  topicPerformance: Record<string, { attempted: number; correct: number; lastScore: number; accuracy: number }>;
  weakTopics: string[];
  strongTopics: string[];
  weeklyProgress: WeeklyProgressPoint[];
  scoreHistory: {
    attemptId: string;
    quizId: string;
    quizTitle: string;
    topic: string;
    examMode: ExamMode;
    score: number;
    date: string;
  }[];
}
