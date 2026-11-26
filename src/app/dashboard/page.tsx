"use client";

import { useEffect, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { getCurrentUser, logoutUser } from "@/lib/auth";
import {
  getQuizzesByUser,
  getAttemptsByUser,
  calculateUserStats,
  getDueRevisionCards,
} from "@/lib/storage";
import {
  downloadOverallPerformanceReportPdf,
  downloadSingleQuizReportPdf,
} from "@/lib/pdf-report";
import { AnalysisInsights, QuestionReview } from "@/components/QuizReport";
import { User, Quiz, QuizAttempt, UserStats, Difficulty } from "@/types";
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
  Eye,
  AlertTriangle,
  Download,
  Calendar,
  Layers,
  CheckCircle2,
  Clock,
} from "lucide-react";
import { formatDate } from "@/lib/utils";

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [attempts, setAttempts] = useState<QuizAttempt[]>([]);
  const [stats, setStats] = useState<UserStats | null>(null);
  const [dueRevisionCount, setDueRevisionCount] = useState(0);
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
    setDueRevisionCount(getDueRevisionCards(currentUser.id).length);
  }, [router]);

  const handleLogout = () => {
    logoutUser();
    router.push("/login");
  };

  if (!user || !stats) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-500"></div>
      </div>
    );
  }

  // Build SVG Performance Improvement Line Chart points
  const chartHistory = stats.scoreHistory.slice(-12);
  const chartW = 600;
  const chartH = 180;
  const padX = 32;
  const padY = 20;
  const plotW = chartW - padX * 2;
  const plotH = chartH - padY * 2;

  const svgPoints = chartHistory.map((pt, i) => {
    const x =
      chartHistory.length === 1
        ? padX + plotW / 2
        : padX + (i / (chartHistory.length - 1)) * plotW;
    const y = padY + plotH - (Math.min(100, Math.max(0, pt.score)) / 100) * plotH;
    return { x, y, ...pt };
  });

  const polylineStr = svgPoints.map((p) => `${p.x},${p.y}`).join(" ");
  const areaStr =
    svgPoints.length > 0
      ? `${svgPoints[0].x},${padY + plotH} ${polylineStr} ${
          svgPoints[svgPoints.length - 1].x
        },${padY + plotH}`
      : "";

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      {/* Top Navbar */}
      <nav className="bg-slate-900/80 backdrop-blur-md border-b border-slate-800 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 py-3.5 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 shadow-md shadow-indigo-500/20">
              <Brain className="w-6 h-6 text-white" />
            </div>
            <span className="font-bold text-lg text-white">
              Adaptive Quiz Application
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Link
              href="/quiz/create"
              className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold flex items-center gap-1.5 transition"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span>New Quiz</span>
            </Link>
            <Link
              href="/revision"
              className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-amber-300 text-xs font-semibold flex items-center gap-1.5 transition"
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Smart Revision</span>
              {dueRevisionCount > 0 && (
                <span className="px-1.5 py-0.5 rounded-full bg-amber-500 text-slate-950 text-[10px] font-bold">
                  {dueRevisionCount}
                </span>
              )}
            </Link>
            <Link
              href="/study-plan"
              className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-purple-300 text-xs font-semibold flex items-center gap-1.5 transition"
            >
              <Calendar className="w-3.5 h-3.5" />
              <span>7-Day Plan</span>
            </Link>
            <button
              onClick={() => downloadOverallPerformanceReportPdf(user, stats, attempts)}
              className="px-3 py-1.5 rounded-lg bg-emerald-600/20 border border-emerald-500/40 hover:bg-emerald-600/30 text-emerald-300 text-xs font-semibold flex items-center gap-1.5 transition"
            >
              <Download className="w-3.5 h-3.5" />
              <span>PDF Report</span>
            </button>
            <button
              onClick={handleLogout}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-rose-500/20 text-slate-300 hover:text-rose-300 text-xs transition"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Logout</span>
            </button>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 py-8 space-y-8">
        {/* Greeting + Quick Action Row */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-extrabold text-white">
              Welcome back, {user.name}
            </h1>
            <p className="text-sm text-slate-400 mt-1">
              Track your adaptive accuracy, weekly progress, and spaced repetition deck.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link
              href="/quiz/create?mode=syllabus"
              className="px-4 py-2 rounded-xl bg-slate-900 border border-emerald-500/40 hover:border-emerald-400 text-emerald-300 text-xs font-semibold transition"
            >
              Quiz from Image / Text
            </Link>
          </div>
        </div>

        {/* 6 Core KPI Cards */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <StatCard
            icon={<BookOpen className="w-4 h-4 text-indigo-400" />}
            label="Quizzes Attempted"
            value={stats.totalQuizzes}
          />
          <StatCard
            icon={<CheckCircle2 className="w-4 h-4 text-sky-400" />}
            label="Questions Answered"
            value={stats.totalQuestionsAnswered}
          />
          <StatCard
            icon={<Target className="w-4 h-4 text-emerald-400" />}
            label="Overall Accuracy"
            value={`${stats.overallAccuracy}%`}
          />
          <StatCard
            icon={<Trophy className="w-4 h-4 text-amber-400" />}
            label="Highest Score"
            value={`${stats.bestScore}%`}
          />
          <StatCard
            icon={<BarChart3 className="w-4 h-4 text-purple-400" />}
            label="Average Score"
            value={`${stats.averageScore}%`}
          />
          <StatCard
            icon={<Clock className="w-4 h-4 text-rose-400" />}
            label="Avg Time / Q"
            value={`${stats.averageTimePerQuestion}s`}
          />
        </div>

        {/* Performance Improvement Graph + Difficulty-Wise Performance */}
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Performance Improvement Line Graph */}
          <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-2xl p-6">
            <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
              <div>
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-indigo-400" />
                  <span>Performance Improvement Graph</span>
                </h2>
                <p className="text-xs text-slate-400">
                  Shows whether your quiz scores are improving across recent attempts
                </p>
              </div>
              <span
                className={`px-3 py-1 rounded-full text-xs font-bold border ${
                  stats.trendStatus === "improving"
                    ? "bg-emerald-500/15 text-emerald-300 border-emerald-500/30"
                    : stats.trendStatus === "needs_focus"
                    ? "bg-rose-500/15 text-rose-300 border-rose-500/30"
                    : "bg-indigo-500/15 text-indigo-300 border-indigo-500/30"
                }`}
              >
                {stats.trendStatus === "improving"
                  ? `Improving (+${stats.improvementTrend}%) ↑`
                  : stats.trendStatus === "needs_focus"
                  ? `Needs Focus (${stats.improvementTrend}%) ↓`
                  : `Steady (${stats.improvementTrend >= 0 ? "+" : ""}${stats.improvementTrend}%) →`}
              </span>
            </div>

            {chartHistory.length === 0 ? (
              <div className="h-44 flex items-center justify-center text-sm text-slate-500 border border-dashed border-slate-800 rounded-xl">
                Complete at least 1 quiz to see your performance improvement curve.
              </div>
            ) : (
              <div className="w-full overflow-x-auto">
                <svg
                  viewBox={`0 0 ${chartW} ${chartH}`}
                  className="w-full h-48 overflow-visible"
                >
                  <defs>
                    <linearGradient id="scoreGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#6366f1" stopOpacity="0.35" />
                      <stop offset="100%" stopColor="#6366f1" stopOpacity="0" />
                    </linearGradient>
                  </defs>
                  {/* Horizontal Gridlines */}
                  {[0, 25, 50, 75, 100].map((val) => {
                    const gy = padY + plotH - (val / 100) * plotH;
                    return (
                      <g key={val}>
                        <line
                          x1={padX}
                          y1={gy}
                          x2={chartW - padX}
                          y2={gy}
                          stroke="#1e293b"
                          strokeDasharray="4 4"
                        />
                        <text
                          x={padX - 8}
                          y={gy + 3}
                          textAnchor="end"
                          fontSize="9"
                          fill="#64748b"
                        >
                          {val}%
                        </text>
                      </g>
                    );
                  })}
                  {areaStr && <polygon points={areaStr} fill="url(#scoreGrad)" />}
                  {polylineStr && (
                    <polyline
                      fill="none"
                      stroke="#818cf8"
                      strokeWidth="3"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      points={polylineStr}
                    />
                  )}
                  {svgPoints.map((p, idx) => (
                    <g key={p.attemptId}>
                      <circle
                        cx={p.x}
                        cy={p.y}
                        r="4.5"
                        fill="#a5b4fc"
                        stroke="#1e1b4b"
                        strokeWidth="2"
                      />
                      <text
                        x={p.x}
                        y={p.y - 9}
                        textAnchor="middle"
                        fontSize="9"
                        fontWeight="bold"
                        fill="#e2e8f0"
                      >
                        {p.score}%
                      </text>
                      <text
                        x={p.x}
                        y={chartH - 3}
                        textAnchor="middle"
                        fontSize="8"
                        fill="#64748b"
                      >
                        #{idx + 1}
                      </text>
                    </g>
                  ))}
                </svg>
              </div>
            )}
          </div>

          {/* Difficulty-Wise Performance */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
            <h2 className="text-lg font-bold text-white">
              Difficulty-Wise Performance
            </h2>
            <p className="text-xs text-slate-400">
              Accuracy across all 4 adaptive levels (Easy → Expert)
            </p>
            <div className="space-y-3.5 pt-1">
              {(["easy", "medium", "hard", "expert"] as Difficulty[]).map((d) => {
                const dp = stats.difficultyPerformance[d];
                const barColor =
                  d === "easy"
                    ? "bg-emerald-500"
                    : d === "medium"
                    ? "bg-indigo-500"
                    : d === "hard"
                    ? "bg-amber-500"
                    : "bg-rose-500";
                return (
                  <div key={d} className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="font-semibold uppercase text-slate-300">
                        {d}
                      </span>
                      <span className="text-slate-400">
                        {dp.correct}/{dp.total} ({dp.accuracy}%)
                      </span>
                    </div>
                    <div className="h-2.5 bg-slate-950 rounded-full overflow-hidden border border-slate-800">
                      <div
                        className={`h-full ${barColor} rounded-full transition-all`}
                        style={{ width: `${dp.accuracy}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Strongest Topics, Weakest Topics & Weekly Progress */}
        <div className="grid md:grid-cols-3 gap-6">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-3">
            <h3 className="font-bold text-emerald-300 text-sm flex items-center gap-2">
              <Trophy className="w-4 h-4" />
              <span>Strongest Topics (≥80%)</span>
            </h3>
            {stats.strongTopics.length === 0 ? (
              <p className="text-xs text-slate-500">
                Score 80%+ on a topic to build your strong areas list.
              </p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {stats.strongTopics.map((t) => (
                  <span
                    key={t}
                    className="px-2.5 py-1 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs font-medium"
                  >
                    {t}
                  </span>
                ))}
              </div>
            )}
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-3">
            <h3 className="font-bold text-amber-300 text-sm flex items-center gap-2">
              <AlertTriangle className="w-4 h-4" />
              <span>Weakest Topics (Click to Practice)</span>
            </h3>
            {stats.weakTopics.length === 0 ? (
              <p className="text-xs text-slate-500">
                No weak topics flagged yet—keep taking adaptive quizzes!
              </p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {stats.weakTopics.map((t) => (
                  <Link
                    key={t}
                    href={`/quiz/create?topic=${encodeURIComponent(t)}&weakArea=true`}
                    className="px-2.5 py-1 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 text-amber-300 text-xs font-medium transition"
                  >
                    {t} →
                  </Link>
                ))}
              </div>
            )}
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-3">
            <h3 className="font-bold text-indigo-300 text-sm flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              <span>Weekly Progress</span>
            </h3>
            {stats.weeklyProgress.length === 0 ? (
              <p className="text-xs text-slate-500">
                Weekly quiz volume and average score will appear here.
              </p>
            ) : (
              <div className="space-y-2">
                {stats.weeklyProgress.slice(-4).map((w) => (
                  <div
                    key={w.weekLabel}
                    className="flex items-center justify-between text-xs p-2 rounded-lg bg-slate-950 border border-slate-800"
                  >
                    <span className="text-slate-300 font-medium">
                      Week of {w.weekLabel}
                    </span>
                    <span className="text-slate-400">
                      {w.quizzes} quizzes •{" "}
                      <strong className="text-indigo-300">{w.avgScore}% avg</strong>
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Saved Quizzes Library + Previous Quiz History */}
        <div className="grid lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold text-white">Saved Quizzes Library</h2>
              <Link
                href="/quiz/create"
                className="text-xs px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold"
              >
                + Generate Quiz
              </Link>
            </div>

            {quizzes.length === 0 ? (
              <div className="bg-slate-900 rounded-2xl border border-slate-800 p-8 text-center">
                <p className="text-sm text-slate-400 mb-4">
                  No saved quizzes yet. Complete your first quiz to save it permanently!
                </p>
                <Link
                  href="/quiz/create"
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-semibold"
                >
                  <span>Start Adaptive Quiz</span>
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                {quizzes.map((quiz) => {
                  const userQuizAttempts = attempts.filter((a) => a.quizId === quiz.id);
                  const latestAttempt = userQuizAttempts[0];
                  const bestQuizScore =
                    userQuizAttempts.length > 0
                      ? Math.max(...userQuizAttempts.map((a) => a.score))
                      : null;

                  return (
                    <div
                      key={quiz.id}
                      className="bg-slate-900 rounded-2xl border border-slate-800 p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                    >
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-bold text-white text-base">{quiz.title}</h3>
                          <span className="px-2 py-0.5 rounded-full text-[11px] bg-indigo-500/15 text-indigo-300 border border-indigo-500/30">
                            {quiz.topic}
                          </span>
                          {bestQuizScore !== null && (
                            <span className="px-2 py-0.5 rounded-full text-[11px] bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                              Best: {bestQuizScore}%
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-400 mt-1">
                          {quiz.questions.length} Questions • Saved {formatDate(quiz.createdAt)}
                        </p>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        {latestAttempt && (
                          <button
                            onClick={() => setSelectedAttempt(latestAttempt)}
                            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>Analysis</span>
                          </button>
                        )}
                        <Link
                          href={`/quiz/${quiz.id}`}
                          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold"
                        >
                          {userQuizAttempts.length > 0 ? (
                            <>
                              <RotateCcw className="w-3.5 h-3.5" />
                              <span>Reattempt</span>
                            </>
                          ) : (
                            <>
                              <Play className="w-3.5 h-3.5" />
                              <span>Start</span>
                            </>
                          )}
                        </Link>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Previous Quiz History Sidebar */}
          <div className="space-y-4">
            <h2 className="text-xl font-bold text-white">Previous Quiz History</h2>
            {attempts.length === 0 ? (
              <div className="bg-slate-900 rounded-2xl border border-slate-800 p-6 text-center text-xs text-slate-400">
                No completed attempts yet.
              </div>
            ) : (
              <div className="space-y-3">
                {attempts.map((attempt) => (
                  <div
                    key={attempt.id}
                    className="bg-slate-900 rounded-2xl border border-slate-800 p-4 space-y-2"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="font-semibold text-white text-sm">
                          {attempt.quizTitle || `${attempt.topic} Quiz`}
                        </p>
                        <p className="text-xs text-slate-400">
                          {formatDate(attempt.completedAt)} • {attempt.correctCount}/
                          {attempt.totalQuestions} •{" "}
                          {attempt.analysis?.averageTimePerQuestion || 0}s/q
                        </p>
                      </div>
                      <span
                        className={`text-sm font-bold px-2.5 py-1 rounded-lg ${
                          attempt.score >= 75
                            ? "bg-emerald-500/15 text-emerald-400"
                            : attempt.score >= 50
                            ? "bg-amber-500/15 text-amber-400"
                            : "bg-rose-500/15 text-rose-400"
                        }`}
                      >
                        {attempt.score}%
                      </span>
                    </div>
                    <div className="flex items-center justify-between pt-2 border-t border-slate-800/80 text-xs">
                      <button
                        onClick={() => setSelectedAttempt(attempt)}
                        className="text-indigo-400 hover:text-indigo-300 font-medium flex items-center gap-1"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>View Full Analysis & Log</span>
                      </button>
                      <button
                        onClick={() => downloadSingleQuizReportPdf(attempt, user.name)}
                        className="text-emerald-400 hover:text-emerald-300 font-medium flex items-center gap-1"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>PDF</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Full Attempt Analysis Modal (with Decision Log, Time Management, AI Feedback & PDF Download) */}
        {selectedAttempt && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto p-6 space-y-5">
              <div className="flex items-start justify-between gap-4 border-b border-slate-800 pb-4">
                <div>
                  <h3 className="text-xl font-bold text-white">
                    {selectedAttempt.quizTitle}
                  </h3>
                  <p className="text-xs text-slate-400 mt-1">
                    {formatDate(selectedAttempt.completedAt)} • Score: {selectedAttempt.score}% (
                    {selectedAttempt.correctCount}/{selectedAttempt.totalQuestions}) • Avg Time:{" "}
                    {selectedAttempt.analysis?.averageTimePerQuestion || 0}s/q
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => downloadSingleQuizReportPdf(selectedAttempt, user.name)}
                    className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-xs text-white font-semibold flex items-center gap-1"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>PDF</span>
                  </button>
                  <button
                    onClick={() => setSelectedAttempt(null)}
                    className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs text-slate-300"
                  >
                    Close
                  </button>
                </div>
              </div>

              {selectedAttempt.analysis && (
                <div className="p-4 rounded-xl bg-indigo-500/10 border border-indigo-500/30 space-y-2">
                  <p className="text-xs font-bold uppercase text-indigo-300">
                    Personalized Feedback & Time Management
                  </p>
                  <p className="text-sm text-slate-200">
                    {selectedAttempt.analysis.aiPersonalizedFeedback ||
                      selectedAttempt.analysis.recommendation}
                  </p>
                  {selectedAttempt.analysis.timeManagementNote && (
                    <p className="text-xs text-amber-300">
                      ⏱ {selectedAttempt.analysis.timeManagementNote}
                    </p>
                  )}
                </div>
              )}

              {selectedAttempt.analysis?.decisionLog &&
                selectedAttempt.analysis.decisionLog.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                      Adaptive Engine Decision Log
                    </h4>
                    {selectedAttempt.analysis.decisionLog.map((d) => (
                      <div
                        key={d.questionNumber}
                        className="p-3 rounded-lg bg-slate-950 border border-slate-800 text-xs text-slate-300 flex justify-between gap-2"
                      >
                        <span>
                          <strong>Q{d.questionNumber}:</strong> {d.reason}
                        </span>
                        <span className="text-indigo-300 font-mono uppercase shrink-0">
                          {d.previousDifficulty}→{d.nextDifficulty}
                        </span>
                      </div>
                    ))}
                  </div>
                )}

              <AnalysisInsights attempt={selectedAttempt} />
              <QuestionReview attempt={selectedAttempt} />
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
}: {
  icon: ReactNode;
  label: string;
  value: string | number;
}) {
  return (
    <div className="bg-slate-900 p-4 rounded-2xl border border-slate-800">
      <div className="flex items-center gap-2 mb-2 text-slate-400">
        {icon}
        <p className="text-[11px] font-medium truncate">{label}</p>
      </div>
      <p className="text-2xl font-extrabold text-white">{value}</p>
    </div>
  );
}
