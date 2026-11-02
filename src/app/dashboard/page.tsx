"use client";

import { useEffect, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { getCurrentUser, logoutUser } from "@/lib/auth";
import { getPublicQuizzes, getAttemptsByUser, calculateUserStats } from "@/lib/storage";
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
} from "lucide-react";
import { formatDate } from "@/lib/utils";

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [attempts, setAttempts] = useState<QuizAttempt[]>([]);
  const [stats, setStats] = useState<UserStats | null>(null);

  useEffect(() => {
    const currentUser = getCurrentUser();
    if (!currentUser) {
      router.push("/login");
      return;
    }
    if (currentUser.role === "teacher") {
      router.push("/teacher");
      return;
    }
    setUser(currentUser);
    setQuizzes(getPublicQuizzes());
    setAttempts(getAttemptsByUser(currentUser.id));
    setStats(calculateUserStats(currentUser.id));
  }, [router]);

  const handleLogout = () => {
    logoutUser();
    router.push("/");
  };

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <nav className="bg-white border-b border-slate-200 sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Brain className="w-7 h-7 text-blue-600" />
            <span className="font-bold text-slate-800">AI Quiz Master</span>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-slate-600">
              Hi, <span className="font-medium text-slate-900">{user.name}</span>
            </span>
            <button
              onClick={handleLogout}
              className="flex items-center gap-1.5 text-sm text-slate-600 hover:text-red-600 transition"
            >
              <LogOut className="w-4 h-4" />
              Logout
            </button>
          </div>
        </div>
      </nav>

      <main className="max-w-6xl mx-auto px-4 py-8">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <StatCard
            icon={<BookOpen className="w-5 h-5 text-blue-600" />}
            label="Quizzes Taken"
            value={stats?.totalQuizzes || 0}
          />
          <StatCard
            icon={<Trophy className="w-5 h-5 text-amber-500" />}
            label="Avg Score"
            value={`${stats?.averageScore || 0}%`}
          />
          <StatCard
            icon={<Target className="w-5 h-5 text-green-600" />}
            label="Strong Topics"
            value={stats?.strongTopics?.length || 0}
          />
          <StatCard
            icon={<BarChart3 className="w-5 h-5 text-purple-600" />}
            label="Weak Topics"
            value={stats?.weakTopics?.length || 0}
          />
        </div>

        {stats && stats.weakTopics.length > 0 && (
          <div className="mb-8 p-4 bg-amber-50 border border-amber-200 rounded-xl">
            <h3 className="font-semibold text-amber-800 mb-1">Focus Areas</h3>
            <p className="text-sm text-amber-700">
              Practice more on:{" "}
              <span className="font-medium">{stats.weakTopics.join(", ")}</span>
            </p>
          </div>
        )}

        <div className="grid lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-slate-900">Available Quizzes</h2>
              <Link
                href="/quiz/create"
                className="flex items-center gap-1.5 text-sm text-blue-600 hover:text-blue-700 font-medium"
              >
                <PlusCircle className="w-4 h-4" />
                Generate New
              </Link>
            </div>

            {quizzes.length === 0 ? (
              <div className="bg-white rounded-xl border border-slate-200 p-10 text-center">
                <BookOpen className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                <p className="text-slate-600 mb-4">No quizzes available yet.</p>
                <Link
                  href="/quiz/create"
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition"
                >
                  <PlusCircle className="w-4 h-4" />
                  Create Your First Quiz
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                {quizzes.map((quiz) => (
                  <div
                    key={quiz.id}
                    className="bg-white rounded-xl border border-slate-200 p-5 hover:border-blue-200 hover:shadow-sm transition"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <h3 className="font-semibold text-slate-900">{quiz.title}</h3>
                        <p className="text-sm text-slate-500 mt-0.5">
                          {quiz.topic} • {quiz.questions.length} questions
                        </p>
                        <p className="text-xs text-slate-400 mt-1">
                          Created {formatDate(quiz.createdAt)}
                        </p>
                      </div>
                      <Link
                        href={`/quiz/${quiz.id}`}
                        className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white text-sm rounded-lg font-medium hover:bg-blue-700 transition shrink-0"
                      >
                        <Play className="w-4 h-4" />
                        Start
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div>
            <h2 className="text-xl font-bold text-slate-900 mb-4">Recent Attempts</h2>
            {attempts.length === 0 ? (
              <div className="bg-white rounded-xl border border-slate-200 p-6 text-center text-slate-500 text-sm">
                No attempts yet. Take a quiz to see your progress!
              </div>
            ) : (
              <div className="space-y-3">
                {attempts
                  .slice()
                  .reverse()
                  .slice(0, 5)
                  .map((attempt) => {
                    const quiz = quizzes.find((q) => q.id === attempt.quizId);
                    return (
                      <div
                        key={attempt.id}
                        className="bg-white rounded-xl border border-slate-200 p-4"
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium text-slate-800 text-sm">
                              {quiz?.title || "Quiz"}
                            </p>
                            <p className="text-xs text-slate-500 mt-0.5">
                              {formatDate(attempt.completedAt)}
                            </p>
                          </div>
                          <div
                            className={`text-lg font-bold ${
                              attempt.score >= 70
                                ? "text-green-600"
                                : attempt.score >= 40
                                ? "text-amber-600"
                                : "text-red-600"
                            }`}
                          >
                            {attempt.score}%
                          </div>
                        </div>
                      </div>
                    );
                  })}
              </div>
            )}
          </div>
        </div>
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
    <div className="bg-white rounded-xl border border-slate-200 p-4">
      <div className="flex items-center gap-2 mb-2">
        {icon}
        <span className="text-xs text-slate-500 font-medium">{label}</span>
      </div>
      <p className="text-2xl font-bold text-slate-900">{value}</p>
    </div>
  );
}