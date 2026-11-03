"use client";

import { useEffect, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { getCurrentUser, logoutUser } from "@/lib/auth";
import {
  getQuizzesByUser,
  getAttemptsByUser,
  calculateUserStats,
} from "@/lib/storage";
import { User, Quiz, QuizAttempt, UserStats } from "@/types";
import {
  Brain,
  LogOut,
  BookOpen,
  BarChart3,
  Trophy,
  Target,
  PlusCircle,
  Play,
  RotateCcw,
  TrendingUp,
  Sparkles,
  Clock,
  CheckCircle2,
  Eye,
  AlertTriangle,
} from "lucide-react";
import { formatDate } from "@/lib/utils";

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [attempts, setAttempts] = useState<QuizAttempt[]>([]);
  const [stats, setStats] = useState<UserStats | null>(null);
  const [selectedAttempt, setSelectedAttempt] = useState<QuizAttempt | null>(null);

  useEffect(() => {
    const currentUser = getCurrentUser();
    if (!currentUser) {
      router.push("/login");
      return;
    }
    setUser(currentUser);
    setQuizzes(getQuizzesByUser(currentUser.id));
    setAttempts(getAttemptsByUser(currentUser.id));
    setStats(calculateUserStats(currentUser.id));
  }, [router]);

  const handleLogout = () => {
    logoutUser();
    router.push("/login");
  };

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      {/* Top Navbar */}
      <nav className="bg-slate-900/80 backdrop-blur-md border-b border-slate-800 sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-4 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 shadow-md shadow-indigo-500/20">
              <Brain className="w-6 h-6 text-white" />
            </div>
            <div>
              <span className="font-bold text-lg text-white">
                Adaptive Quiz Application
              </span>
              <span className="hidden sm:inline-block ml-2.5 px-2.5 py-0.5 bg-indigo-500/15 border border-indigo-500/30 text-indigo-300 text-xs font-medium rounded-full">
                Student Dashboard
              </span>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <span className="text-sm text-slate-300">
              Welcome, <span className="font-semibold text-white">{user.name}</span>
            </span>
            <button
              onClick={handleLogout}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-red-500/20 text-slate-300 hover:text-red-300 text-sm transition"
            >
              <LogOut className="w-4 h-4" />
              <span>Logout</span>
            </button>
          </div>
        </div>
      </nav>

      <main className="max-w-6xl mx-auto px-4 py-8 space-y-8">
        {/* Top KPI Stat Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard
            icon={<BookOpen className="w-5 h-5 text-indigo-400" />}
            label="Completed Quizzes"
            value={stats?.totalQuizzes || 0}
            subtext={`${quizzes.length} saved in library`}
          />
          <StatCard
            icon={<Trophy className="w-5 h-5 text-amber-400" />}
            label="Average Score"
            value={`${stats?.averageScore || 0}%`}
            subtext={`Best: ${stats?.bestScore || 0}%`}
          />
          <StatCard
            icon={<TrendingUp className="w-5 h-5 text-emerald-400" />}
            label="Improvement Trend"
            value={
              (stats?.improvementTrend || 0) >= 0
                ? `+${stats?.improvementTrend || 0}%`
                : `${stats?.improvementTrend}%`
            }
            subtext="Recent vs earlier attempts"
          />
          <StatCard
            icon={<Target className="w-5 h-5 text-rose-400" />}
            label="Weak Areas Identified"
            value={stats?.weakTopics?.length || 0}
            subtext={`${stats?.strongTopics?.length || 0} strong areas`}
          />
        </div>

        {/* Weak Areas Action Banner */}
        {stats && stats.weakTopics.length > 0 && (
          <div className="p-6 rounded-2xl bg-gradient-to-r from-amber-500/10 via-rose-500/10 to-purple-500/10 border border-amber-500/30 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 text-amber-300 font-semibold text-base mb-1">
                <AlertTriangle className="w-5 h-5 text-amber-400" />
                <span>Recommended Weak-Area Practice</span>
              </div>
              <p className="text-sm text-slate-300">
                Your past quiz analyses show room for improvement in:{" "}
                <span className="font-semibold text-white">
                  {stats.weakTopics.join(", ")}
                </span>
              </p>
            </div>
            <div className="flex flex-wrap gap-2 shrink-0">
              {stats.weakTopics.slice(0, 3).map((weakTopic) => (
                <Link
                  key={weakTopic}
                  href={`/quiz/create?topic=${encodeURIComponent(
                    weakTopic
                  )}&weakArea=true`}
                  className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold text-xs shadow-lg shadow-amber-500/20 transition"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Practice &ldquo;{weakTopic}&rdquo;</span>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Performance History Progression Bar Chart */}
        {stats && stats.scoreHistory.length > 0 && (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                  <BarChart3 className="w-5 h-5 text-indigo-400" />
                  <span>Performance & Score Improvement History</span>
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Track your scores across every completed quiz and reattempt over time
                </p>
              </div>
              <Link
                href="/quiz/create"
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold transition"
              >
                <PlusCircle className="w-4 h-4" />
                <span>New Adaptive Quiz</span>
              </Link>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-3 items-end pt-4">
              {stats.scoreHistory.slice(-8).map((item, idx) => (
                <div
                  key={item.attemptId}
                  className="flex flex-col items-center bg-slate-950/70 border border-slate-800/80 rounded-xl p-3"
                >
                  <span
                    className={`text-sm font-bold mb-2 ${
                      item.score >= 75
                        ? "text-emerald-400"
                        : item.score >= 50
                        ? "text-amber-400"
                        : "text-rose-400"
                    }`}
                  >
                    {item.score}%
                  </span>
                  <div className="w-full h-24 bg-slate-900 rounded-lg flex items-end p-1 overflow-hidden">
                    <div
                      className={`w-full rounded-md transition-all ${
                        item.score >= 75
                          ? "bg-gradient-to-t from-emerald-600 to-emerald-400"
                          : item.score >= 50
                          ? "bg-gradient-to-t from-amber-600 to-amber-400"
                          : "bg-gradient-to-t from-rose-600 to-rose-400"
                      }`}
                      style={{ height: `${Math.max(item.score, 10)}%` }}
                    />
                  </div>
                  <p
                    className="text-xs font-medium text-slate-300 mt-2 truncate w-full text-center"
                    title={item.quizTitle}
                  >
                    #{idx + 1} {item.topic}
                  </p>
                  <p className="text-[10px] text-slate-500">
                    {formatDate(item.date)}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Main 2-Column Content: Saved Quizzes (Reattempt) & Completed Quiz History */}
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Saved Quizzes Library */}
          <div className="lg:col-span-2 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-white">
                  Saved Quizzes Library
                </h2>
                <p className="text-xs text-slate-400">
                  Every quiz you complete is permanently saved here with all questions, options & verified answers for future retakes.
                </p>
              </div>
              <Link
                href="/quiz/create"
                className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white text-sm font-semibold shadow-lg shadow-indigo-600/20 transition shrink-0"
              >
                <PlusCircle className="w-4 h-4" />
                <span>Generate Quiz</span>
              </Link>
            </div>

            {quizzes.length === 0 ? (
              <div className="bg-slate-900 rounded-2xl border border-slate-800 p-10 text-center">
                <BookOpen className="w-12 h-12 text-slate-600 mx-auto mb-3" />
                <h3 className="text-base font-semibold text-white mb-1">
                  No Saved Quizzes Yet
                </h3>
                <p className="text-sm text-slate-400 mb-5">
                  Start your first adaptive AI quiz—once completed, it will be saved permanently in your account for retakes and review.
                </p>
                <Link
                  href="/quiz/create"
                  className="inline-flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-xl font-semibold hover:bg-indigo-500 transition"
                >
                  <PlusCircle className="w-4 h-4" />
                  <span>Start Your First Adaptive Quiz</span>
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                {quizzes.map((quiz) => {
                  const userQuizAttempts = attempts.filter(
                    (a) => a.quizId === quiz.id
                  );
                  const latestAttempt = userQuizAttempts[0];
                  const bestQuizScore =
                    userQuizAttempts.length > 0
                      ? Math.max(...userQuizAttempts.map((a) => a.score))
                      : null;

                  return (
                    <div
                      key={quiz.id}
                      className="bg-slate-900 rounded-2xl border border-slate-800 p-5 hover:border-indigo-500/40 transition"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="font-bold text-white text-base">
                              {quiz.title}
                            </h3>
                            <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-500/15 text-indigo-300 border border-indigo-500/30">
                              {quiz.topic}
                            </span>
                            {userQuizAttempts.length > 0 && (
                              <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                                {userQuizAttempts.length}{" "}
                                {userQuizAttempts.length === 1
                                  ? "Attempt"
                                  : "Attempts"}{" "}
                                • Best: {bestQuizScore}%
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-slate-400 mt-1.5">
                            {quiz.questions.length} Verified Questions • Saved{" "}
                            {formatDate(quiz.createdAt)}
                            {latestAttempt
                              ? ` • Last score: ${latestAttempt.score}%`
                              : ""}
                          </p>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          {latestAttempt && (
                            <button
                              onClick={() => setSelectedAttempt(latestAttempt)}
                              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium transition"
                            >
                              <Eye className="w-3.5 h-3.5" />
                              <span>View Analysis</span>
                            </button>
                          )}
                          <Link
                            href={`/quiz/${quiz.id}`}
                            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold transition"
                          >
                            {userQuizAttempts.length > 0 ? (
                              <>
                                <RotateCcw className="w-3.5 h-3.5" />
                                <span>Reattempt Quiz</span>
                              </>
                            ) : (
                              <>
                                <Play className="w-3.5 h-3.5" />
                                <span>Start Quiz</span>
                              </>
                            )}
                          </Link>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Quiz History & Past Attempts Sidebar */}
          <div className="space-y-4">
            <div>
              <h2 className="text-xl font-bold text-white">Quiz History</h2>
              <p className="text-xs text-slate-400">
                Click any past attempt to inspect full questions, explanations & weak-area analysis.
              </p>
            </div>

            {attempts.length === 0 ? (
              <div className="bg-slate-900 rounded-2xl border border-slate-800 p-6 text-center text-slate-400 text-sm">
                No completed attempts yet. Complete a quiz to unlock full history and analytics!
              </div>
            ) : (
              <div className="space-y-3">
                {attempts.map((attempt) => {
                  const quiz = quizzes.find((q) => q.id === attempt.quizId);
                  const displayTitle =
                    attempt.quizTitle || quiz?.title || `${attempt.topic} Quiz`;

                  return (
                    <div
                      key={attempt.id}
                      className="bg-slate-900 rounded-2xl border border-slate-800 p-4 hover:border-slate-700 transition"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-semibold text-white text-sm">
                            {displayTitle}
                          </p>
                          <p className="text-xs text-slate-400 mt-0.5 flex items-center gap-2">
                            <span>{formatDate(attempt.completedAt)}</span>
                            <span>•</span>
                            <span>
                              {attempt.correctCount}/{attempt.totalQuestions} correct
                            </span>
                          </p>
                          {attempt.analysis?.weakAreas &&
                            attempt.analysis.weakAreas.length > 0 && (
                              <p className="text-[11px] text-amber-400 mt-1">
                                Weak: {attempt.analysis.weakAreas.join(", ")}
                              </p>
                            )}
                        </div>
                        <div
                          className={`text-base font-extrabold px-2.5 py-1 rounded-lg ${
                            attempt.score >= 75
                              ? "bg-emerald-500/15 text-emerald-400"
                              : attempt.score >= 50
                              ? "bg-amber-500/15 text-amber-400"
                              : "bg-rose-500/15 text-rose-400"
                          }`}
                        >
                          {attempt.score}%
                        </div>
                      </div>

                      <div className="mt-3 pt-3 border-t border-slate-800/80 flex items-center justify-between gap-2">
                        <button
                          onClick={() => setSelectedAttempt(attempt)}
                          className="text-xs text-indigo-400 hover:text-indigo-300 font-medium flex items-center gap-1"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>Review Answers & Analysis</span>
                        </button>
                        <Link
                          href={`/quiz/${attempt.quizId}`}
                          className="text-xs text-slate-300 hover:text-white font-medium flex items-center gap-1"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                          <span>Reattempt</span>
                        </Link>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Modal for Reviewing Saved Attempt Questions, Answers, Explanations & Analysis */}
        {selectedAttempt && (
          <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto p-6 space-y-6">
              <div className="flex items-start justify-between gap-4 border-b border-slate-800 pb-4">
                <div>
                  <h3 className="text-xl font-bold text-white">
                    {selectedAttempt.quizTitle || "Quiz Attempt Analysis"}
                  </h3>
                  <p className="text-xs text-slate-400 mt-1">
                    Completed on {formatDate(selectedAttempt.completedAt)} • Score:{" "}
                    <span className="text-white font-semibold">
                      {selectedAttempt.score}% ({selectedAttempt.correctCount}/
                      {selectedAttempt.totalQuestions})
                    </span>{" "}
                    • Time: {selectedAttempt.timeTaken}s
                  </p>
                </div>
                <button
                  onClick={() => setSelectedAttempt(null)}
                  className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs text-slate-300"
                >
                  Close
                </button>
              </div>

              {selectedAttempt.analysis && (
                <div className="p-4 rounded-xl bg-indigo-500/10 border border-indigo-500/30 space-y-2">
                  <p className="text-xs font-semibold uppercase tracking-wider text-indigo-300">
                    Diagnostic Recommendation
                  </p>
                  <p className="text-sm text-slate-200">
                    {selectedAttempt.analysis.recommendation}
                  </p>
                  {selectedAttempt.analysis.weakAreas?.length > 0 && (
                    <div className="pt-2 flex items-center gap-2 flex-wrap">
                      <span className="text-xs text-amber-300 font-medium">
                        Weak Subtopics:
                      </span>
                      {selectedAttempt.analysis.weakAreas.map((w) => (
                        <Link
                          key={w}
                          href={`/quiz/create?topic=${encodeURIComponent(
                            w
                          )}&weakArea=true`}
                          className="text-xs px-2.5 py-1 rounded-lg bg-amber-500/20 border border-amber-500/40 text-amber-300 hover:bg-amber-500/30"
                        >
                          Practice {w} →
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              )}

              <div className="space-y-4">
                <h4 className="text-sm font-bold uppercase tracking-wider text-slate-400">
                  Saved Questions, Options, Verified Answers & Explanations
                </h4>
                {(
                  selectedAttempt.questionsSnapshot ||
                  quizzes.find((q) => q.id === selectedAttempt.quizId)?.questions ||
                  []
                ).map((q, idx) => {
                  const userAns = selectedAttempt.answers[idx];
                  const isCorrect = userAns === q.correctAnswer;

                  return (
                    <div
                      key={q.id || idx}
                      className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2"
                    >
                      <div className="flex items-center justify-between text-xs text-slate-400">
                        <span>
                          Question {idx + 1} • {q.subtopic || q.topic || "Concept"} (
                          {q.difficulty})
                        </span>
                        <span
                          className={
                            isCorrect ? "text-emerald-400 font-semibold" : "text-rose-400 font-semibold"
                          }
                        >
                          {isCorrect ? "✓ Correct" : "✗ Incorrect"}
                        </span>
                      </div>
                      <p className="text-sm font-semibold text-white">{q.question}</p>
                      <div className="grid sm:grid-cols-2 gap-2 pt-1">
                        {q.options.map((opt, oIdx) => {
                          const isRight = oIdx === q.correctAnswer;
                          const isPicked = oIdx === userAns;
                          return (
                            <div
                              key={oIdx}
                              className={`text-xs p-2.5 rounded-lg border ${
                                isRight
                                  ? "border-emerald-500/50 bg-emerald-500/10 text-emerald-200 font-medium"
                                  : isPicked
                                  ? "border-rose-500/50 bg-rose-500/10 text-rose-200"
                                  : "border-slate-800 text-slate-400"
                              }`}
                            >
                              {String.fromCharCode(65 + oIdx)}. {opt}
                              {isRight && " (Correct Answer)"}
                              {isPicked && !isRight && " (Your Choice)"}
                            </div>
                          );
                        })}
                      </div>
                      <p className="text-xs text-slate-300 bg-slate-900 p-2.5 rounded-lg border border-slate-800 mt-2">
                        <span className="font-semibold text-indigo-300">
                          Explanation:{" "}
                        </span>
                        {q.explanation}
                      </p>
                    </div>
                  );
                })}
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
                <Link
                  href={`/quiz/${selectedAttempt.quizId}`}
                  className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold"
                >
                  <RotateCcw className="w-4 h-4" />
                  <span>Reattempt This Quiz Now</span>
                </Link>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  subtext,
}: {
  icon: ReactNode;
  label: string;
  value: string | number;
  subtext?: string;
}) {
  return (
    <div className="bg-slate-900 p-5 rounded-2xl border border-slate-800">
      <div className="flex items-center gap-3 mb-2">
        <div className="p-2.5 bg-slate-950 border border-slate-800 rounded-xl">
          {icon}
        </div>
        <p className="text-xs font-medium text-slate-400">{label}</p>
      </div>
      <p className="text-2xl font-extrabold text-white">{value}</p>
      {subtext && <p className="text-[11px] text-slate-500 mt-1">{subtext}</p>}
    </div>
  );
}
