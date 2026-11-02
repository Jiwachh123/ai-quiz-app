"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { User } from "@/types";
import {
  Brain,
  Loader2,
  ArrowLeft,
  Sparkles,
  CheckCircle,
  XCircle,
} from "lucide-react";

export default function CreateQuizPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [sessionToken, setSessionToken] = useState("");
  const [currentQuestion, setCurrentQuestion] = useState<any>(null);
  const [pendingQuestion, setPendingQuestion] = useState<any>(null);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [feedback, setFeedback] = useState<any>(null);
  const [answeredCount, setAnsweredCount] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [quizFinished, setQuizFinished] = useState(false);
  const [nextQuestionLoading, setNextQuestionLoading] = useState(false);
  const [checkingAnswer, setCheckingAnswer] = useState(false);
  const [title, setTitle] = useState("");
  const [topic, setTopic] = useState("");
  const [description, setDescription] = useState("");
  const [count, setCount] = useState(10);
  const [difficulty, setDifficulty] = useState<"easy" | "medium" | "hard">("medium");
  const [isPublic, setIsPublic] = useState(true);
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
  setProgress("Preparing your adaptive quiz...");

  try {
    const response = await fetch("/api/adaptive-quiz/start", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ topic, count, difficulty }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || "Could not start quiz");
    }

    setSessionToken(data.sessionToken);
    setCurrentQuestion(data.question);
    setSelectedAnswer(null);
    setFeedback(null);
    setAnsweredCount(0);
    setCorrectCount(0);
    setQuizFinished(false);
    setProgress("");
  } catch (err) {
    setError(
      err instanceof Error
        ? err.message
        : "Could not start quiz. Please try again."
    );
  } finally {
    setGenerating(false);
  }
};
  const handleAnswer = async () => {
  if (selectedAnswer === null || !currentQuestion || checkingAnswer) {
    return;
  }

  setCheckingAnswer(true);
  setError("");

  try {
    const response = await fetch("/api/adaptive-quiz/answer", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        sessionToken,
        questionId: currentQuestion.id,
        answer: selectedAnswer,
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

    if (data.completed) {
      setQuizFinished(true);
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
  const handleNextQuestion = () => {
  if (!pendingQuestion) return;

  setCurrentQuestion(pendingQuestion);
  setPendingQuestion(null);
  setSelectedAnswer(null);
  setFeedback(null);
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
      {currentQuestion && (
  <div className="min-h-screen bg-slate-50 p-4">
    <div className="max-w-3xl mx-auto py-10">
      <div className="bg-white rounded-2xl shadow-sm border p-6 md:p-8">
        <div className="flex justify-between items-center mb-6">
          <span className="text-sm text-slate-600">
            Question {answeredCount + (feedback ? 0 : 1)} of {count}
          </span>
          <span className="text-sm font-semibold text-blue-600 capitalize">
            {currentQuestion.difficulty}
          </span>
        </div>

        <div className="h-2 bg-slate-100 rounded-full mb-8">
          <div
            className="h-2 bg-blue-600 rounded-full"
            style={{ width: `${(answeredCount / count) * 100}%` }}
          />
        </div>

        <h2 className="text-xl font-bold text-slate-900 mb-6">
          {currentQuestion.question}
        </h2>

        <div className="space-y-3">
          {currentQuestion.options.map((option: string, index: number) => {
            const isCorrect =
              feedback && index === feedback.correctAnswer;
            const isSelected = selectedAnswer === index;

            return (
              <button
                key={index}
                disabled={!!feedback || checkingAnswer}
                onClick={() => setSelectedAnswer(index)}
                className={`w-full text-left p-4 rounded-xl border transition ${
                  isCorrect
                    ? "border-green-500 bg-green-50 text-green-800"
                    : feedback && isSelected
                    ? "border-red-500 bg-red-50 text-red-800"
                    : isSelected
                    ? "border-blue-500 bg-blue-50 text-blue-800"
                    : "border-slate-200 hover:border-blue-400"
                }`}
              >
                {String.fromCharCode(65 + index)}. {option}
                {feedback && isCorrect && (
                  <CheckCircle className="inline ml-2 w-5 h-5 text-green-600" />
                )}
                {feedback && isSelected && !isCorrect && (
                  <XCircle className="inline ml-2 w-5 h-5 text-red-600" />
                )}
              </button>
            );
          })}
        </div>

        {feedback && (
          <div className="mt-6 p-4 rounded-xl bg-blue-50 border border-blue-100">
            <p className="font-semibold text-slate-900 mb-2">
              {feedback.isCorrect ? "Correct!" : "Incorrect!"}
            </p>
            <p className="text-sm text-slate-700">
              {feedback.explanation}
            </p>
            <p className="text-sm text-slate-600 mt-2">
              Score: {correctCount} / {answeredCount}
            </p>
            <p className="text-sm text-slate-600 mt-1">
              Next difficulty: {feedback.nextDifficulty}
            </p>
          </div>
        )}

        {quizFinished ? (
          <div className="mt-6 text-center">
            <h2 className="text-2xl font-bold text-slate-900">
              Quiz completed!
            </h2>
            <p className="text-lg mt-3">
              Your score: {correctCount} / {count}
            </p>
            <button
              onClick={() => router.push("/dashboard")}
              className="mt-5 px-6 py-3 bg-blue-600 text-white rounded-lg"
            >
              Back to Dashboard
            </button>
          </div>
        ) : feedback ? (
          <button
            onClick={handleNextQuestion}
            disabled={!pendingQuestion || nextQuestionLoading}
            className="w-full mt-6 py-3 bg-blue-600 text-white rounded-lg font-semibold disabled:opacity-50"
          >
            Next Question
          </button>
        ) : (
          <button
            onClick={handleAnswer}
            disabled={selectedAnswer === null || checkingAnswer}
            className="w-full mt-6 py-3 bg-blue-600 text-white rounded-lg font-semibold disabled:opacity-50"
          >
            {checkingAnswer ? "Checking..." : "Submit Answer"}
          </button>
        )}
      </div>
    </div>
  </div>
)}
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

      {!currentQuestion && (
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
                  Starting Quiz... Please wait
                </>
              ) : (
                <>
                  <Sparkles className="w-5 h-5" />
                  Start Quiz
                </>
              )}
            </button>

            
          </div>
        </div>

       
      </main>
      )}
    </div>
  );
}