"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { generateQuestions } from "@/lib/gemini";
import { createQuiz } from "@/lib/storage";
import { User, Question } from "@/types";
import { Brain, Loader2, ArrowLeft, Sparkles, Save } from "lucide-react";

export default function CreateQuizPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [title, setTitle] = useState("");
  const [topic, setTopic] = useState("");
  const [description, setDescription] = useState("");
  const [count, setCount] = useState(10);
  const [difficulty, setDifficulty] = useState<"easy" | "medium" | "hard">("medium");
  const [isPublic, setIsPublic] = useState(true);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [progress, setProgress] = useState("");

  useEffect(() => {
    const currentUser = getCurrentUser();
    if (!currentUser) {
      router.push("/login");
      return;
    }
    setUser(currentUser);
  }, [router]);

  const handleGenerate = async () => {
    if (!topic.trim()) {
      setError("Please enter a topic");
      return;
    }
    setError("");
    setGenerating(true);
    setProgress("Generating questions... Please wait");

    try {
      const generated = await generateQuestions(topic, count, difficulty);
      setQuestions(generated);
      if (!title) {
        setTitle(`${topic} Quiz`);
      }
      setProgress("");
    } catch (err) {
      setError("Failed to generate questions. Please try again.");
      setProgress("");
    } finally {
      setGenerating(false);
    }
  };

  const handleSave = () => {
    if (!user || questions.length === 0) return;
    if (!title.trim()) {
      setError("Please enter a title");
      return;
    }

    setSaving(true);
    const quiz = createQuiz(
      title,
      description || `Quiz on ${topic}`,
      topic,
      questions,
      user.id,
      isPublic
    );
    setSaving(false);

    if (user.role === "teacher") {
      router.push("/teacher");
    } else {
      router.push(`/quiz/${quiz.id}`);
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
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link
            href={user.role === "teacher" ? "/teacher" : "/dashboard"}
            className="flex items-center gap-2 text-slate-600 hover:text-slate-900"
          >
            <ArrowLeft className="w-5 h-5" />
            Back
          </Link>
          <div className="flex items-center gap-2">
            <Brain className="w-6 h-6 text-blue-600" />
            <span className="font-bold text-slate-800">Create Quiz</span>
          </div>
          <div className="w-16" />
        </div>
      </nav>

      <main className="max-w-4xl mx-auto px-4 py-8">
        <div className="bg-white rounded-2xl border border-slate-200 p-6 md:p-8 shadow-sm">
          <div className="flex items-center gap-2 mb-6">
            <Sparkles className="w-6 h-6 text-blue-600" />
            <h1 className="text-xl font-bold text-slate-900">
              Generate Quiz with AI
            </h1>
          </div>

          {error && (
            <div className="mb-5 p-3 bg-red-50 text-red-700 text-sm rounded-lg border border-red-100">
              {error}
            </div>
          )}

          <div className="grid md:grid-cols-2 gap-5 mb-6">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                Topic *
              </label>
              <input
                type="text"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder="e.g. Indian Geography, Photosynthesis"
                className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                Number of Questions
              </label>
              <select
                value={count}
                onChange={(e) => setCount(Number(e.target.value))}
                className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              >
                {[5, 10, 15, 20, 25, 30, 40, 50].map((n) => (
                  <option key={n} value={n}>
                    {n} Questions
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                Difficulty
              </label>
              <select
                value={difficulty}
                onChange={(e) =>
                  setDifficulty(e.target.value as "easy" | "medium" | "hard")
                }
                className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              >
                <option value="easy">Easy</option>
                <option value="medium">Medium</option>
                <option value="hard">Hard</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                Quiz Title
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Auto-generated from topic"
                className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              />
            </div>
          </div>

          <div className="mb-6">
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              Description (optional)
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none resize-none"
              placeholder="Short description of the quiz"
            />
          </div>

          <div className="flex items-center gap-3 mb-8">
            <input
              type="checkbox"
              id="isPublic"
              checked={isPublic}
              onChange={(e) => setIsPublic(e.target.checked)}
              className="w-4 h-4 text-blue-600 rounded"
            />
            <label htmlFor="isPublic" className="text-sm text-slate-700">
              Make this quiz public (visible to all students)
            </label>
          </div>

          {progress && (
            <div className="mb-4 p-3 bg-blue-50 text-blue-700 text-sm rounded-lg">
              {progress}
            </div>
          )}

          <div className="flex flex-col sm:flex-row gap-3">
            <button
              onClick={handleGenerate}
              disabled={generating}
              className="flex-1 flex items-center justify-center gap-2 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition disabled:opacity-60"
            >
              {generating ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Generating... Please wait
                </>
              ) : (
                <>
                  <Sparkles className="w-5 h-5" />
                  Generate Questions
                </>
              )}
            </button>

            {questions.length > 0 && (
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex-1 flex items-center justify-center gap-2 py-3 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 transition disabled:opacity-60"
              >
                {saving ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <Save className="w-5 h-5" />
                )}
                Save Quiz ({questions.length})
              </button>
            )}
          </div>
        </div>

        {/* Preview Questions - Answers Hidden */}
        {questions.length > 0 && (
          <div className="mt-8">
            <h2 className="text-lg font-bold text-slate-900 mb-4">
              Generated Questions ({questions.length})
            </h2>
            <div className="space-y-4">
              {questions.map((q, idx) => (
                <div
                  key={q.id}
                  className="bg-white rounded-xl border border-slate-200 p-5"
                >
                  <div className="flex items-start gap-3">
                    <span className="flex-shrink-0 w-7 h-7 bg-blue-100 text-blue-700 rounded-full flex items-center justify-center text-sm font-semibold">
                      {idx + 1}
                    </span>
                    <div className="flex-1">
                      <p className="font-medium text-slate-900 mb-3">{q.question}</p>
                      <div className="grid sm:grid-cols-2 gap-2">
                        {q.options.map((opt, i) => (
                          <div
                            key={i}
                            className="px-3 py-2 rounded-lg text-sm bg-slate-50 text-slate-700 border border-slate-200"
                          >
                            {String.fromCharCode(65 + i)}. {opt}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}