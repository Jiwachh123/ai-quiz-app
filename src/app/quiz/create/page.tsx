"use client";

import { useEffect, useState, useRef, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import {
  saveCompletedAdaptiveQuizAndAttempt,
  calculateUserStats,
  buildQuizAnalysis,
  updateAttemptFeedback,
} from "@/lib/storage";
import { downloadSingleQuizReportPdf } from "@/lib/pdf-report";
import {
  User,
  QuizAttempt,
  Question,
  Difficulty,
  ConfidenceLevel,
  ExamMode,
  AdaptiveDecisionLogEntry,
} from "@/types";
import { v4 as uuidv4 } from "uuid";
import {
  Brain,
  Loader2,
  ArrowLeft,
  Sparkles,
  CheckCircle,
  XCircle,
  AlertTriangle,
  RotateCcw,
  Target,
  Trophy,
  Lock,
  Clock,
  FileText,
  Upload,
  Gauge,
  Download,
  TrendingUp,
  GraduationCap,
  BookOpen,
} from "lucide-react";

const GATE_SUBJECTS = [
  "Operating Systems (GATE)",
  "Database Management Systems (GATE)",
  "Computer Networks (GATE)",
  "Algorithms & Complexity (GATE)",
  "Data Structures (GATE)",
  "Theory of Computation (GATE)",
  "Compiler Design (GATE)",
  "Digital Logic (GATE)",
  "Computer Organization & Architecture (GATE)",
  "Discrete Mathematics (GATE)",
];

const BEU_SUBJECTS = [
  "Data Structures & Algorithms (BEU)",
  "Operating Systems (BEU)",
  "Database Management Systems (BEU)",
  "Computer Networks (BEU)",
  "Software Engineering (BEU)",
  "Artificial Intelligence & ML (BEU)",
  "Compiler Design (BEU)",
  "Cloud Computing (BEU)",
  "Web Technologies (BEU)",
];

const DIFF_STEPS: Difficulty[] = ["easy", "medium", "hard", "expert"];

function formatSec(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

function CreateQuizContent() {
  const searchParams = useSearchParams();

  const [user, setUser] = useState<User | null>(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [weakTopics, setWeakTopics] = useState<string[]>([]);

  // Setup state
  const [examMode, setExamMode] = useState<ExamMode>("custom");
  const [title, setTitle] = useState("");
  const [topic, setTopic] = useState("");
  const [description, setDescription] = useState("");
  const [count, setCount] = useState(6);
  const [difficulty, setDifficulty] = useState<Difficulty>("medium");
  const [timerPerQuestion, setTimerPerQuestion] = useState<number>(60); // 0 = no countdown limit
  const [syllabusText, setSyllabusText] = useState("");
  const [uploadingPdf, setUploadingPdf] = useState(false);
  const [pdfNotice, setPdfNotice] = useState("");

  // Active quiz state
  const [sessionToken, setSessionToken] = useState("");
  const [currentQuestion, setCurrentQuestion] = useState<any>(null);
  const [pendingQuestion, setPendingQuestion] = useState<any>(null);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [confidence, setConfidence] = useState<ConfidenceLevel>("medium");
  const [feedback, setFeedback] = useState<any>(null);
  const [answeredCount, setAnsweredCount] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [quizFinished, setQuizFinished] = useState(false);
  const [savedAttempt, setSavedAttempt] = useState<QuizAttempt | null>(null);
  const [loadingAiFeedback, setLoadingAiFeedback] = useState(false);
  const [checkingAnswer, setCheckingAnswer] = useState(false);
  const [disputing, setDisputing] = useState(false);
  const [disputeResult, setDisputeResult] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState("");

  // Timers
  const [quizStartTime, setQuizStartTime] = useState<number>(Date.now());
  const [questionElapsedSec, setQuestionElapsedSec] = useState<number>(0);
  const [totalRemainingSec, setTotalRemainingSec] = useState<number | null>(null);
  const questionStartRef = useRef<number>(Date.now());

  useEffect(() => {
    const currentUser = getCurrentUser();
    setUser(currentUser);
    setAuthChecked(true);

    if (currentUser) {
      const stats = calculateUserStats(currentUser.id);
      setWeakTopics(stats.weakTopics || []);
    }

    const paramTopic = searchParams.get("topic");
    const paramMode = searchParams.get("mode") as ExamMode | null;
    const isWeakArea = searchParams.get("weakArea");

    if (paramMode && ["custom", "gate", "beu", "syllabus"].includes(paramMode)) {
      setExamMode(paramMode);
    }
    if (paramTopic) {
      setTopic(paramTopic);
      if (isWeakArea) {
        setTitle(`Weak-Area Practice: ${paramTopic}`);
        setDescription(`Targeted adaptive practice session focusing on ${paramTopic}`);
      }
    }
  }, [searchParams]);

  // Live timer effect during active quiz
  useEffect(() => {
    if (!currentQuestion || quizFinished) return;

    const interval = setInterval(() => {
      if (!feedback) {
        setQuestionElapsedSec(
          Math.max(1, Math.floor((Date.now() - questionStartRef.current) / 1000))
        );
      }
      setTotalRemainingSec((prev) => {
        if (prev === null) return null;
        return Math.max(0, prev - 1);
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [currentQuestion, quizFinished, feedback]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingPdf(true);
    setPdfNotice("");
    setError("");

    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/extract-pdf", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Upload failed");

      if (data.text) {
        setSyllabusText(data.text);
        if (!topic.trim()) {
          setTopic(file.name.replace(/\.(pdf|txt)$/i, ""));
        }
        setPdfNotice(
          `Extracted ${data.characters} characters from "${data.fileName}". You can review or edit it below.`
        );
      } else if (data.warning) {
        setPdfNotice(data.warning);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not process file.");
    } finally {
      setUploadingPdf(false);
    }
  };

  const fetchAiFeedbackForAttempt = async (
    attempt: QuizAttempt,
    isLoggedIn: boolean
  ) => {
    setLoadingAiFeedback(true);
    try {
      const diffOrder: Record<Difficulty, number> = {
        easy: 1,
        medium: 2,
        hard: 3,
        expert: 4,
      };
      let highest: Difficulty = "easy";
      (attempt.difficultyProgression || []).forEach((d) => {
        if ((diffOrder[d] || 1) > diffOrder[highest]) highest = d;
      });

      const res = await fetch("/api/quiz-feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topic: attempt.topic,
          score: attempt.score,
          correctCount: attempt.correctCount,
          totalQuestions: attempt.totalQuestions,
          averageTimePerQuestion: attempt.analysis.averageTimePerQuestion,
          weakAreas: attempt.analysis.weakAreas,
          strongAreas: attempt.analysis.strongAreas,
          highestDifficultyReached: highest,
        }),
      });
      const data = await res.json();
      if (data.feedback) {
        if (isLoggedIn) {
          updateAttemptFeedback(attempt.id, data.feedback);
        }
        setSavedAttempt((prev) =>
          prev
            ? {
                ...prev,
                analysis: {
                  ...prev.analysis,
                  aiPersonalizedFeedback: data.feedback,
                },
              }
            : prev
        );
      }
    } catch {
      // keep default recommendation
    } finally {
      setLoadingAiFeedback(false);
    }
  };

  const handleGenerate = async (overrideTopic?: string) => {
    const targetTopic = (overrideTopic ?? topic).trim();
    if (!targetTopic) {
      setError("Please enter a topic, pick a subject, or upload a syllabus.");
      return;
    }
    if (examMode === "syllabus" && syllabusText.trim().length < 20) {
      setError("Please upload a PDF/TXT file or paste syllabus text (at least 20 characters).");
      return;
    }

    setError("");
    setGenerating(true);
    setQuizStartTime(Date.now());
    questionStartRef.current = Date.now();
    setQuestionElapsedSec(0);
    setTotalRemainingSec(timerPerQuestion > 0 ? timerPerQuestion * count : null);

    try {
      const response = await fetch("/api/adaptive-quiz/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topic: targetTopic,
          count,
          difficulty,
          examMode,
          syllabusText: examMode === "syllabus" ? syllabusText : undefined,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Could not start adaptive quiz");
      }

      if (overrideTopic) setTopic(overrideTopic);
      setSessionToken(data.sessionToken);
      setCurrentQuestion(data.question);
      setSelectedAnswer(null);
      setConfidence("medium");
      setFeedback(null);
      setDisputeResult(null);
      setAnsweredCount(0);
      setCorrectCount(0);
      setQuizFinished(false);
      setSavedAttempt(null);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Could not start quiz. Please try again."
      );
    } finally {
      setGenerating(false);
    }
  };

  const handleAnswer = async () => {
    if (selectedAnswer === null || !currentQuestion || checkingAnswer) return;

    setCheckingAnswer(true);
    setError("");
    setDisputeResult(null);

    const timeSpentOnThisQuestion = Math.max(
      1,
      Math.round((Date.now() - questionStartRef.current) / 1000)
    );

    try {
      const response = await fetch("/api/adaptive-quiz/answer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionToken,
          questionId: currentQuestion.id,
          answer: selectedAnswer,
          timeTakenSec: timeSpentOnThisQuestion,
          confidence,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Could not check your answer");
      }

      setFeedback(data);
      setSessionToken(data.sessionToken || sessionToken);
      setAnsweredCount(data.answeredCount);
      setCorrectCount(data.correctCount);

      if (data.completed && data.completedQuizData) {
        const timeTaken = Math.round((Date.now() - quizStartTime) / 1000);
        const finalQuestions = data.completedQuizData.questions as Question[];
        const finalAnswers = data.completedQuizData.answers as number[];
        const finalTimes = data.completedQuizData.questionTimes as number[];
        const finalConfidences = data.completedQuizData.confidences as ConfidenceLevel[];
        const finalLog = data.completedQuizData.decisionLog as AdaptiveDecisionLogEntry[];
        const finalTopic = data.completedQuizData.topic || topic;
        const finalMode = (data.completedQuizData.examMode || examMode) as ExamMode;

        let createdAttempt: QuizAttempt;
        if (user) {
          const { attempt } = saveCompletedAdaptiveQuizAndAttempt({
            userId: user.id,
            title: title.trim() || `${finalTopic} (${finalMode.toUpperCase()}) Quiz`,
            description,
            topic: finalTopic,
            examMode: finalMode,
            questions: finalQuestions,
            answers: finalAnswers,
            questionTimes: finalTimes,
            confidences: finalConfidences,
            decisionLog: finalLog,
            timeTaken,
          });
          createdAttempt = attempt;
        } else {
          const correctTotal = finalQuestions.reduce(
            (acc, q, idx) => acc + (finalAnswers[idx] === q.correctAnswer ? 1 : 0),
            0
          );
          const score =
            finalQuestions.length > 0
              ? Math.round((correctTotal / finalQuestions.length) * 100)
              : 0;
          createdAttempt = {
            id: uuidv4(),
            quizId: "guest",
            quizTitle: title.trim() || `${finalTopic} Adaptive Quiz (Guest)`,
            topic: finalTopic,
            examMode: finalMode,
            userId: "guest",
            answers: finalAnswers,
            questionTimes: finalTimes,
            confidences: finalConfidences,
            score,
            totalQuestions: finalQuestions.length,
            correctCount: correctTotal,
            difficultyProgression: finalQuestions.map((q) => q.difficulty),
            completedAt: new Date().toISOString(),
            timeTaken,
            questionsSnapshot: finalQuestions,
            analysis: buildQuizAnalysis(finalQuestions, finalAnswers, finalTopic, {
              questionTimes: finalTimes,
              totalTimeTaken: timeTaken,
              decisionLog: finalLog,
            }),
          };
        }

        setSavedAttempt(createdAttempt);
        setQuizFinished(true);
        fetchAiFeedbackForAttempt(createdAttempt, !!user);
      } else {
        setPendingQuestion(data.question || null);
      }
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Could not check your answer. Please try again."
      );
    } finally {
      setCheckingAnswer(false);
    }
  };

  const handleDisputeAnswer = async () => {
    if (!currentQuestion || !feedback || disputing) return;
    setDisputing(true);
    setDisputeResult(null);

    try {
      const res = await fetch("/api/verify-question", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question: currentQuestion.question,
          options: currentQuestion.options,
          currentCorrectAnswer: feedback.correctAnswer,
          userSelectedAnswer: selectedAnswer,
          explanation: feedback.explanation,
        }),
      });
      const audit = await res.json();
      if (!res.ok) throw new Error(audit.error || "Verification failed");

      if (audit.changed) {
        const userNowCorrect = selectedAnswer === audit.verifiedCorrectAnswer;
        setFeedback((prev: any) => ({
          ...prev,
          correctAnswer: audit.verifiedCorrectAnswer,
          isCorrect: userNowCorrect,
          explanation: audit.verificationExplanation,
        }));
        if (userNowCorrect && !feedback.isCorrect) {
          setCorrectCount((c) => c + 1);
        }
        setDisputeResult(
          `AI Arbitrator updated the official answer key to Option ${String.fromCharCode(
            65 + audit.verifiedCorrectAnswer
          )} (Confidence: ${audit.confidence}%).`
        );
      } else {
        setFeedback((prev: any) => ({
          ...prev,
          explanation: audit.verificationExplanation || prev.explanation,
        }));
        setDisputeResult(
          `AI Arbitrator verified Option ${String.fromCharCode(
            65 + audit.verifiedCorrectAnswer
          )} is accurate (Confidence: ${audit.confidence}%).`
        );
      }
    } catch {
      setDisputeResult("Could not reach AI Arbitrator right now.");
    } finally {
      setDisputing(false);
    }
  };

  const handleNextQuestion = () => {
    if (!pendingQuestion) return;
    setCurrentQuestion(pendingQuestion);
    setPendingQuestion(null);
    setSelectedAnswer(null);
    setConfidence("medium");
    setFeedback(null);
    setDisputeResult(null);
    questionStartRef.current = Date.now();
    setQuestionElapsedSec(0);
  };

  if (!authChecked) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <nav className="bg-slate-900/80 backdrop-blur-md border-b border-slate-800 sticky top-0 z-40">
        <div className="max-w-5xl mx-auto px-4 py-3.5 flex items-center justify-between">
          <Link
            href={user ? "/dashboard" : "/"}
            className="flex items-center gap-2 text-slate-300 hover:text-white text-sm font-medium"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>{user ? "Dashboard" : "Home"}</span>
          </Link>
          <div className="flex items-center gap-2">
            <Brain className="w-6 h-6 text-indigo-400" />
            <span className="font-bold text-white">Adaptive Quiz Application</span>
          </div>
          {user ? (
            <span className="text-xs px-2.5 py-1 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
              History Saving On
            </span>
          ) : (
            <Link
              href="/login"
              className="text-xs px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-medium"
            >
              Sign In
            </Link>
          )}
        </div>
      </nav>

      {/* POST-QUIZ DETAILED ANALYSIS SCREEN */}
      {quizFinished && savedAttempt ? (
        <main className="max-w-4xl mx-auto px-4 py-8 space-y-6">
          {!user && (
            <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-start gap-3">
                <Lock className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-bold text-amber-300">
                    Guest Session (Not Saved Permanently)
                  </p>
                  <p className="text-xs text-slate-300 mt-0.5">
                    Sign in to save history, unlock Smart Revision spaced repetition, and generate a 7-Day AI Study Plan.
                  </p>
                </div>
              </div>
              <Link
                href="/login"
                className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold shrink-0"
              >
                Sign In Now
              </Link>
            </div>
          )}

          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 md:p-8">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-6">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 bg-indigo-500/15 border border-indigo-500/30 rounded-2xl flex items-center justify-center shrink-0">
                  <Trophy className="w-7 h-7 text-indigo-400" />
                </div>
                <div>
                  <h1 className="text-2xl font-extrabold text-white">
                    {user ? "Quiz Analyzed & Saved!" : "Guest Quiz Analysis"}
                  </h1>
                  <p className="text-slate-400 text-sm">{savedAttempt.quizTitle}</p>
                </div>
              </div>

              <button
                onClick={() =>
                  downloadSingleQuizReportPdf(savedAttempt, user?.name || "Guest Student")
                }
                className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-lg transition"
              >
                <Download className="w-4 h-4" />
                <span>Download Report (PDF)</span>
              </button>
            </div>

            {/* KPI Summary + Time Management */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6">
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 text-center">
                <p className="text-3xl font-extrabold text-indigo-400">
                  {savedAttempt.score}%
                </p>
                <p className="text-xs text-slate-400 mt-1">Accuracy</p>
              </div>
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 text-center">
                <p className="text-2xl font-bold text-white">
                  {savedAttempt.correctCount}/{savedAttempt.totalQuestions}
                </p>
                <p className="text-xs text-slate-400 mt-1">Correct</p>
              </div>
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 text-center">
                <p className="text-2xl font-bold text-amber-300">
                  {savedAttempt.analysis.averageTimePerQuestion}s
                </p>
                <p className="text-xs text-slate-400 mt-1">Avg Time / Question</p>
              </div>
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 text-center">
                <p className="text-2xl font-bold text-emerald-300">
                  {savedAttempt.timeTaken}s
                </p>
                <p className="text-xs text-slate-400 mt-1">Total Time</p>
              </div>
            </div>

            {/* Time Management Diagnosis */}
            <div className="mt-4 p-4 rounded-xl bg-slate-950 border border-slate-800 flex items-start gap-3">
              <Clock className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
              <div className="text-xs text-slate-300 space-y-1">
                <p className="font-semibold text-white">Time Management Analysis</p>
                <p>{savedAttempt.analysis.timeManagementNote}</p>
                <p className="text-slate-400">
                  Fastest question: {savedAttempt.analysis.fastestTimeSec}s • Slowest question:{" "}
                  {savedAttempt.analysis.slowestTimeSec}s
                </p>
              </div>
            </div>

            {/* AI-Generated Personalized Feedback */}
            <div className="mt-4 p-5 rounded-xl bg-gradient-to-r from-indigo-500/15 via-purple-500/10 to-slate-900 border border-indigo-500/30">
              <div className="flex items-center gap-2 text-indigo-300 text-xs font-bold uppercase tracking-wider mb-2">
                <Sparkles className="w-4 h-4" />
                <span>AI-Generated Personalized Feedback</span>
              </div>
              {loadingAiFeedback ? (
                <div className="flex items-center gap-2 text-sm text-slate-300">
                  <Loader2 className="w-4 h-4 animate-spin text-indigo-400" />
                  <span>Writing personalized diagnosis of your weak spots & study next steps...</span>
                </div>
              ) : (
                <p className="text-sm text-slate-200 leading-relaxed">
                  {savedAttempt.analysis.aiPersonalizedFeedback ||
                    savedAttempt.analysis.recommendation}
                </p>
              )}
            </div>

            {/* 4-Level Difficulty Breakdown */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-5">
              {DIFF_STEPS.map((diff) => {
                const stats = savedAttempt.analysis.difficultyBreakdown?.[diff] || {
                  total: 0,
                  correct: 0,
                };
                return (
                  <div
                    key={diff}
                    className="p-3.5 rounded-xl bg-slate-950 border border-slate-800"
                  >
                    <p className="text-xs uppercase font-semibold text-slate-400">
                      {diff}
                    </p>
                    <p className="text-lg font-bold text-white mt-1">
                      {stats.correct} / {stats.total}
                    </p>
                    <p className="text-[11px] text-slate-500">
                      {stats.total > 0
                        ? `${Math.round((stats.correct / stats.total) * 100)}% accuracy`
                        : "Not reached"}
                    </p>
                  </div>
                );
              })}
            </div>

            <div className="mt-6 flex flex-wrap gap-3">
              {user && (
                <>
                  <Link
                    href={`/quiz/${savedAttempt.quizId}`}
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold"
                  >
                    <RotateCcw className="w-4 h-4" />
                    <span>Reattempt Quiz</span>
                  </Link>
                  <Link
                    href="/revision"
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-semibold"
                  >
                    <Target className="w-4 h-4" />
                    <span>Smart Revision Deck</span>
                  </Link>
                  <Link
                    href="/study-plan"
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold"
                  >
                    <Sparkles className="w-4 h-4" />
                    <span>Generate 7-Day Study Plan</span>
                  </Link>
                  <Link
                    href="/dashboard"
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium"
                  >
                    <span>Dashboard</span>
                  </Link>
                </>
              )}
              {!user && (
                <button
                  onClick={() => {
                    setQuizFinished(false);
                    setCurrentQuestion(null);
                  }}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>Take Another Quiz</span>
                </button>
              )}
            </div>
          </div>

          {/* ADAPTIVE ENGINE DECISION LOG */}
          {savedAttempt.analysis.decisionLog &&
            savedAttempt.analysis.decisionLog.length > 0 && (
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-3">
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-indigo-400" />
                  <h2 className="text-lg font-bold text-white">
                    Adaptive Engine Decision Log
                  </h2>
                </div>
                <p className="text-xs text-slate-400">
                  Every difficulty transition logged using your streak, 6–9 question window, response time, and confidence.
                </p>
                <div className="space-y-2.5 pt-2">
                  {savedAttempt.analysis.decisionLog.map((entry) => (
                    <div
                      key={entry.questionNumber}
                      className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs font-bold px-2 py-0.5 rounded bg-slate-800 text-white">
                            Q{entry.questionNumber}
                          </span>
                          <span
                            className={`text-xs font-semibold ${
                              entry.isCorrect ? "text-emerald-400" : "text-rose-400"
                            }`}
                          >
                            {entry.isCorrect ? "Correct" : "Wrong"}
                          </span>
                          <span className="text-xs text-slate-500">•</span>
                          <span className="text-xs text-slate-400">
                            {entry.timeTakenSec}s • Confidence: {entry.confidence}
                          </span>
                        </div>
                        <p className="text-xs text-slate-200">{entry.reason}</p>
                      </div>
                      <span className="text-[11px] font-mono uppercase px-2.5 py-1 rounded-lg bg-indigo-500/15 text-indigo-300 border border-indigo-500/30 shrink-0">
                        {entry.previousDifficulty} → {entry.nextDifficulty}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

          {/* FULL QUESTION REVIEW */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
            <h2 className="text-lg font-bold text-white">
              Question-by-Question Review & Explanations
            </h2>
            {savedAttempt.questionsSnapshot.map((q, idx) => {
              const userAns = savedAttempt.answers[idx];
              const isCorrect = userAns === q.correctAnswer;
              return (
                <div
                  key={q.id || idx}
                  className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2"
                >
                  <div className="flex items-center justify-between text-xs text-slate-400">
                    <span>
                      Q{idx + 1} • {q.subtopic || q.topic} ({q.difficulty.toUpperCase()})
                      {savedAttempt.questionTimes?.[idx]
                        ? ` • ${savedAttempt.questionTimes[idx]}s`
                        : ""}
                    </span>
                    <span
                      className={
                        isCorrect
                          ? "text-emerald-400 font-semibold"
                          : "text-rose-400 font-semibold"
                      }
                    >
                      {isCorrect ? "✓ Correct" : "✗ Incorrect"}
                    </span>
                  </div>
                  <p className="text-sm font-semibold text-white">{q.question}</p>
                  <div className="grid sm:grid-cols-2 gap-2 pt-1">
                    {q.options.map((opt, oIdx) => (
                      <div
                        key={oIdx}
                        className={`text-xs p-2.5 rounded-lg border ${
                          oIdx === q.correctAnswer
                            ? "border-emerald-500/50 bg-emerald-500/10 text-emerald-200 font-medium"
                            : oIdx === userAns
                            ? "border-rose-500/50 bg-rose-500/10 text-rose-200"
                            : "border-slate-800 text-slate-400"
                        }`}
                      >
                        {String.fromCharCode(65 + oIdx)}. {opt}
                      </div>
                    ))}
                  </div>
                  <p className="text-xs text-slate-300 bg-slate-900 p-2.5 rounded-lg border border-slate-800">
                    <span className="font-semibold text-indigo-300">Explanation: </span>
                    {q.explanation}
                  </p>
                </div>
              );
            })}
          </div>
        </main>
      ) : currentQuestion ? (
        /* ACTIVE ADAPTIVE QUIZ SCREEN */
        <div className="max-w-3xl mx-auto px-4 py-8">
          <div className="bg-slate-900 rounded-2xl border border-slate-800 p-6 md:p-8 shadow-xl">
            {/* Top Status Bar: Question #, 4-Level Difficulty Ladder, Live Timers */}
            <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
              <div>
                <span className="text-xs font-medium text-slate-400">
                  Question {answeredCount + (feedback ? 0 : 1)} of {count} •{" "}
                  <span className="text-indigo-300">
                    {currentQuestion.subtopic || topic}
                  </span>
                </span>
                {/* 4-Level Difficulty Cap Indicator */}
                <div className="flex items-center gap-1.5 mt-2">
                  {DIFF_STEPS.map((lvl) => {
                    const active = currentQuestion.difficulty === lvl;
                    return (
                      <span
                        key={lvl}
                        className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-md border ${
                          active
                            ? "bg-indigo-600 text-white border-indigo-400 shadow"
                            : "bg-slate-950 text-slate-500 border-slate-800"
                        }`}
                      >
                        {lvl}
                      </span>
                    );
                  })}
                </div>
              </div>

              <div className="flex items-center gap-2.5">
                <div className="px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-xs font-mono text-slate-300 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Q: {questionElapsedSec}s</span>
                </div>
                {totalRemainingSec !== null && (
                  <div
                    className={`px-3 py-1.5 rounded-xl border text-xs font-mono flex items-center gap-1.5 ${
                      totalRemainingSec <= 30
                        ? "bg-rose-500/15 border-rose-500/40 text-rose-300"
                        : "bg-slate-950 border-slate-800 text-amber-300"
                    }`}
                  >
                    <Gauge className="w-3.5 h-3.5" />
                    <span>Left: {formatSec(totalRemainingSec)}</span>
                  </div>
                )}
              </div>
            </div>

            <div className="h-2 bg-slate-800 rounded-full mb-7 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full transition-all"
                style={{ width: `${(answeredCount / count) * 100}%` }}
              />
            </div>

            <h2 className="text-xl font-bold text-white mb-6">
              {currentQuestion.question}
            </h2>

            <div className="space-y-3">
              {currentQuestion.options.map((option: string, index: number) => {
                const isCorrect = feedback && index === feedback.correctAnswer;
                const isSelected = selectedAnswer === index;

                return (
                  <button
                    key={index}
                    disabled={!!feedback || checkingAnswer}
                    onClick={() => setSelectedAnswer(index)}
                    className={`w-full text-left p-4 rounded-xl border transition flex items-center justify-between ${
                      isCorrect
                        ? "border-emerald-500 bg-emerald-500/15 text-emerald-200"
                        : feedback && isSelected
                        ? "border-rose-500 bg-rose-500/15 text-rose-200"
                        : isSelected
                        ? "border-indigo-500 bg-indigo-500/20 text-white"
                        : "border-slate-800 bg-slate-950/60 hover:border-slate-700 text-slate-200"
                    }`}
                  >
                    <span>
                      <strong className="mr-2">
                        {String.fromCharCode(65 + index)}.
                      </strong>
                      {option}
                    </span>
                    {feedback && isCorrect && (
                      <CheckCircle className="w-5 h-5 text-emerald-400 shrink-0" />
                    )}
                    {feedback && isSelected && !isCorrect && (
                      <XCircle className="w-5 h-5 text-rose-400 shrink-0" />
                    )}
                  </button>
                );
              })}
            </div>

            {/* Confidence Soft Signal Selector */}
            {!feedback && (
              <div className="mt-5 p-3.5 rounded-xl bg-slate-950 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <span className="text-xs text-slate-400 font-medium">
                  Confidence Signal (helps Adaptive Engine calibrate difficulty):
                </span>
                <div className="flex items-center gap-2">
                  {(["low", "medium", "high"] as ConfidenceLevel[]).map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setConfidence(c)}
                      className={`px-3 py-1 rounded-lg text-xs font-semibold capitalize border transition ${
                        confidence === c
                          ? c === "high"
                            ? "bg-emerald-500/20 border-emerald-500 text-emerald-300"
                            : c === "medium"
                            ? "bg-indigo-500/20 border-indigo-500 text-indigo-300"
                            : "bg-amber-500/20 border-amber-500 text-amber-300"
                          : "bg-slate-900 border-slate-800 text-slate-400 hover:text-white"
                      }`}
                    >
                      {c}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {feedback && (
              <div className="mt-6 p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2.5">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <p
                    className={`font-bold text-sm ${
                      feedback.isCorrect ? "text-emerald-400" : "text-rose-400"
                    }`}
                  >
                    {feedback.isCorrect ? "✓ Correct Answer!" : "✗ Incorrect"}
                  </p>
                  <button
                    onClick={handleDisputeAnswer}
                    disabled={disputing}
                    className="inline-flex items-center gap-1.5 text-xs text-amber-400 hover:text-amber-300 font-medium"
                  >
                    <AlertTriangle className="w-3.5 h-3.5" />
                    <span>
                      {disputing
                        ? "AI Arbitrator Checking..."
                        : "Think AI Answer Key is Wrong? Verify Now"}
                    </span>
                  </button>
                </div>

                <p className="text-sm text-slate-300">{feedback.explanation}</p>

                {/* Live Adaptive Engine Decision Entry */}
                {feedback.decisionEntry && (
                  <div className="p-2.5 rounded-lg bg-indigo-500/10 border border-indigo-500/30 text-xs text-indigo-200">
                    <strong>Adaptive Engine:</strong> {feedback.decisionEntry.reason}
                  </div>
                )}

                {disputeResult && (
                  <div className="p-2.5 rounded-lg bg-amber-500/15 border border-amber-500/30 text-xs text-amber-200">
                    {disputeResult}
                  </div>
                )}

                <div className="pt-1 flex items-center justify-between text-xs text-slate-400">
                  <span>
                    Score: {correctCount} / {answeredCount}
                  </span>
                  <span>
                    Next Level:{" "}
                    <strong className="text-indigo-300 uppercase">
                      {feedback.nextDifficulty}
                    </strong>
                  </span>
                </div>
              </div>
            )}

            {feedback ? (
              <button
                onClick={handleNextQuestion}
                disabled={!pendingQuestion}
                className="w-full mt-6 py-3.5 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white rounded-xl font-semibold disabled:opacity-50 transition"
              >
                Next Adaptive Question →
              </button>
            ) : (
              <button
                onClick={handleAnswer}
                disabled={selectedAnswer === null || checkingAnswer}
                className="w-full mt-6 py-3.5 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white rounded-xl font-semibold disabled:opacity-50 transition"
              >
                {checkingAnswer ? "Evaluating & Adapting..." : "Submit Answer"}
              </button>
            )}
          </div>
        </div>
      ) : (
        /* QUIZ SETUP SCREEN (Exam Modes, PDF/Syllabus Upload, Timer, Weak Areas) */
        <main className="max-w-4xl mx-auto px-4 py-8 space-y-6">
          {!user && (
            <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 text-xs text-slate-300">
              <strong className="text-amber-300">Guest Mode:</strong> Take quizzes freely without login.{" "}
              <Link href="/login" className="text-indigo-400 underline">
                Sign in
              </Link>{" "}
              to permanently save history, spaced repetition revision, and 7-day study plans.
            </div>
          )}

          {user && weakTopics.length > 0 && (
            <div className="bg-slate-900 border border-amber-500/30 rounded-2xl p-5">
              <div className="flex items-center gap-2 text-amber-300 font-semibold text-sm mb-2">
                <Target className="w-4 h-4 text-amber-400" />
                <span>Quick-Launch Weak-Area Quiz</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {weakTopics.map((wt) => (
                  <button
                    key={wt}
                    type="button"
                    onClick={() => {
                      setExamMode("custom");
                      setTopic(wt);
                      setTitle(`Weak-Area Mastery: ${wt}`);
                    }}
                    className="px-3 py-1.5 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 text-amber-300 text-xs font-medium transition"
                  >
                    {wt}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="bg-slate-900 rounded-2xl border border-slate-800 p-6 md:p-8 shadow-xl space-y-6">
            <div className="flex items-center gap-2.5">
              <Sparkles className="w-6 h-6 text-indigo-400" />
              <div>
                <h1 className="text-xl font-bold text-white">
                  Configure Your Adaptive Quiz
                </h1>
                <p className="text-xs text-slate-400">
                  4-Level Adaptive Engine (Easy → Medium → Hard → Expert) with Exam Modes, Syllabus PDF & Timer
                </p>
              </div>
            </div>

            {/* Exam Mode Selector */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2.5">
                Select Exam Mode
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                  { id: "custom", label: "Custom Topic", icon: Sparkles },
                  { id: "gate", label: "GATE CSE Mode", icon: GraduationCap },
                  { id: "beu", label: "BEU Subjects", icon: BookOpen },
                  { id: "syllabus", label: "PDF / Syllabus", icon: FileText },
                ].map((m) => {
                  const Icon = m.icon;
                  const active = examMode === m.id;
                  return (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => setExamMode(m.id as ExamMode)}
                      className={`p-3 rounded-xl border text-left transition flex items-center gap-2.5 ${
                        active
                          ? "bg-indigo-600/20 border-indigo-500 text-white"
                          : "bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700"
                      }`}
                    >
                      <Icon
                        className={`w-4 h-4 shrink-0 ${
                          active ? "text-indigo-400" : "text-slate-500"
                        }`}
                      />
                      <span className="text-xs font-semibold">{m.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* GATE or BEU Quick Subject Picker */}
            {examMode === "gate" && (
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2.5">
                <p className="text-xs font-semibold text-indigo-300">
                  Pick a GATE CSE Subject:
                </p>
                <div className="flex flex-wrap gap-2">
                  {GATE_SUBJECTS.map((subj) => (
                    <button
                      key={subj}
                      type="button"
                      onClick={() => setTopic(subj)}
                      className={`px-3 py-1.5 rounded-lg text-xs border transition ${
                        topic === subj
                          ? "bg-indigo-600 text-white border-indigo-500"
                          : "bg-slate-900 border-slate-800 text-slate-300 hover:border-indigo-500/50"
                      }`}
                    >
                      {subj.replace(" (GATE)", "")}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {examMode === "beu" && (
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2.5">
                <p className="text-xs font-semibold text-purple-300">
                  Pick a BEU B.Tech CSE Subject:
                </p>
                <div className="flex flex-wrap gap-2">
                  {BEU_SUBJECTS.map((subj) => (
                    <button
                      key={subj}
                      type="button"
                      onClick={() => setTopic(subj)}
                      className={`px-3 py-1.5 rounded-lg text-xs border transition ${
                        topic === subj
                          ? "bg-purple-600 text-white border-purple-500"
                          : "bg-slate-900 border-slate-800 text-slate-300 hover:border-purple-500/50"
                      }`}
                    >
                      {subj.replace(" (BEU)", "")}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* PDF / Syllabus Upload Panel */}
            {examMode === "syllabus" && (
              <div className="p-4 rounded-xl bg-slate-950 border border-indigo-500/30 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <p className="text-xs font-semibold text-indigo-300">
                    Upload PDF / TXT Syllabus or Paste Notes
                  </p>
                  <label className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold cursor-pointer transition">
                    {uploadingPdf ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Upload className="w-3.5 h-3.5" />
                    )}
                    <span>{uploadingPdf ? "Extracting..." : "Upload PDF / TXT"}</span>
                    <input
                      type="file"
                      accept=".pdf,.txt"
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                  </label>
                </div>
                {pdfNotice && (
                  <p className="text-xs text-emerald-300">{pdfNotice}</p>
                )}
                <textarea
                  rows={4}
                  value={syllabusText}
                  onChange={(e) => setSyllabusText(e.target.value)}
                  placeholder="Extracted PDF text will appear here, or you can paste your syllabus / unit topics directly..."
                  className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-800 focus:border-indigo-500 rounded-xl text-xs text-slate-200 outline-none"
                />
              </div>
            )}

            {error && (
              <div className="p-3.5 bg-rose-500/10 text-rose-300 text-sm rounded-xl border border-rose-500/30">
                {error}
              </div>
            )}

            <div className="grid md:grid-cols-2 gap-5">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
                  Topic / Subject Name *
                </label>
                <input
                  type="text"
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  placeholder="e.g. Operating Systems, DBMS, Normalization"
                  className="w-full px-4 py-3 bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-xl text-white text-sm outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
                  Number of Questions
                </label>
                <select
                  value={count}
                  onChange={(e) => setCount(Number(e.target.value))}
                  className="w-full px-4 py-3 bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-xl text-white text-sm outline-none"
                >
                  {[5, 6, 9, 10, 15, 20, 25, 30].map((n) => (
                    <option key={n} value={n}>
                      {n} Questions
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid md:grid-cols-3 gap-5">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
                  Starting Difficulty
                </label>
                <select
                  value={difficulty}
                  onChange={(e) => setDifficulty(e.target.value as Difficulty)}
                  className="w-full px-4 py-3 bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-xl text-white text-sm outline-none"
                >
                  <option value="easy">Easy</option>
                  <option value="medium">Medium</option>
                  <option value="hard">Hard</option>
                  <option value="expert">Expert</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
                  Quiz Timer Mode
                </label>
                <select
                  value={timerPerQuestion}
                  onChange={(e) => setTimerPerQuestion(Number(e.target.value))}
                  className="w-full px-4 py-3 bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-xl text-white text-sm outline-none"
                >
                  <option value={0}>Untimed (Stopwatch Only)</option>
                  <option value={45}>Fast Exam Pace (45s / Q)</option>
                  <option value={60}>Standard Exam (60s / Q)</option>
                  <option value={90}>GATE Deep Analytical (90s / Q)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
                  Custom Title (Optional)
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Auto-named"
                  className="w-full px-4 py-3 bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-xl text-white text-sm outline-none"
                />
              </div>
            </div>

            <button
              onClick={() => handleGenerate()}
              disabled={generating}
              className="w-full flex items-center justify-center gap-2 py-3.5 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white rounded-xl font-semibold transition disabled:opacity-60 shadow-lg shadow-indigo-600/25"
            >
              {generating ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>Generating Adaptive Questions...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-5 h-5" />
                  <span>Start Adaptive Quiz</span>
                </>
              )}
            </button>
          </div>
        </main>
      )}
    </div>
  );
}

export default function CreateQuizPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-slate-950">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-500"></div>
        </div>
      }
    >
      <CreateQuizContent />
    </Suspense>
  );
}
