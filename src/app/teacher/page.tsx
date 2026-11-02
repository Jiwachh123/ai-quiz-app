"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { getCurrentUser, logoutUser } from "@/lib/auth";
import { getQuizzesByUser, getAttemptsByQuiz, deleteQuiz } from "@/lib/storage";
import { User, Quiz } from "@/types";
import {
  Brain,
  LogOut,
  PlusCircle,
  Users,
  BookOpen,
  Trash2,
  BarChart3,
} from "lucide-react";
import { formatDate } from "@/lib/utils";

export default function TeacherPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);

  useEffect(() => {
    const currentUser = getCurrentUser();
    if (!currentUser) {
      router.push("/login");
      return;
    }
    if (currentUser.role !== "teacher") {
      router.push("/dashboard");
      return;
    }
    setUser(currentUser);
    setQuizzes(getQuizzesByUser(currentUser.id));
  }, [router]);

  const handleLogout = () => {
    logoutUser();
    router.push("/");
  };

  const handleDelete = (id: string) => {
    if (confirm("Are you sure you want to delete this quiz?")) {
      deleteQuiz(id);
      setQuizzes((prev) => prev.filter((q) => q.id !== id));
    }
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
            <span className="ml-2 px-2 py-0.5 bg-purple-100 text-purple-700 text-xs font-medium rounded-full">
              Teacher
            </span>
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
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Teacher Dashboard</h1>
            <p className="text-slate-600 mt-1">Create and manage quizzes for your students</p>
          </div>
          <Link
            href="/quiz/create"
            className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition shadow-sm"
          >
            <PlusCircle className="w-5 h-5" />
            Create Quiz with AI
          </Link>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div className="bg-white rounded-xl border border-slate-200 p-5 flex items-center gap-4">
            <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center">
              <BookOpen className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900">{quizzes.length}</p>
              <p className="text-sm text-slate-500">Quizzes Created</p>
            </div>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 p-5 flex items-center gap-4">
            <div className="w-12 h-12 bg-green-50 rounded-xl flex items-center justify-center">
              <Users className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900">
                {quizzes.reduce((acc, q) => acc + getAttemptsByQuiz(q.id).length, 0)}
              </p>
              <p className="text-sm text-slate-500">Total Attempts</p>
            </div>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 p-5 flex items-center gap-4">
            <div className="w-12 h-12 bg-purple-50 rounded-xl flex items-center justify-center">
              <BarChart3 className="w-6 h-6 text-purple-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900">
                {quizzes.filter((q) => q.isPublic).length}
              </p>
              <p className="text-sm text-slate-500">Public Quizzes</p>
            </div>
          </div>
        </div>

        {/* Quiz List */}
        <h2 className="text-xl font-bold text-slate-900 mb-4">Your Quizzes</h2>

        {quizzes.length === 0 ? (
          <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
            <BookOpen className="w-14 h-14 text-slate-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-slate-800 mb-2">No quizzes yet</h3>
            <p className="text-slate-600 mb-6">
              Create your first AI-powered quiz for your students.
            </p>
            <Link
              href="/quiz/create"
              className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition"
            >
              <PlusCircle className="w-5 h-5" />
              Create Quiz
            </Link>
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <table className="w-full">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="text-left px-5 py-3 text-sm font-semibold text-slate-600">
                    Title
                  </th>
                  <th className="text-left px-5 py-3 text-sm font-semibold text-slate-600">
                    Topic
                  </th>
                  <th className="text-left px-5 py-3 text-sm font-semibold text-slate-600">
                    Questions
                  </th>
                  <th className="text-left px-5 py-3 text-sm font-semibold text-slate-600">
                    Attempts
                  </th>
                  <th className="text-left px-5 py-3 text-sm font-semibold text-slate-600">
                    Created
                  </th>
                  <th className="text-right px-5 py-3 text-sm font-semibold text-slate-600">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {quizzes.map((quiz) => {
                  const attempts = getAttemptsByQuiz(quiz.id);
                  return (
                    <tr key={quiz.id} className="border-b border-slate-100 last:border-0">
                      <td className="px-5 py-4">
                        <p className="font-medium text-slate-900">{quiz.title}</p>
                      </td>
                      <td className="px-5 py-4 text-sm text-slate-600">{quiz.topic}</td>
                      <td className="px-5 py-4 text-sm text-slate-600">
                        {quiz.questions.length}
                      </td>
                      <td className="px-5 py-4 text-sm text-slate-600">{attempts.length}</td>
                      <td className="px-5 py-4 text-sm text-slate-500">
                        {formatDate(quiz.createdAt)}
                      </td>
                      <td className="px-5 py-4 text-right">
                        <button
                          onClick={() => handleDelete(quiz.id)}
                          className="p-2 text-slate-400 hover:text-red-600 transition"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </div>
  );
}
