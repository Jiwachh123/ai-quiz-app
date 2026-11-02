"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { getQuizById, saveAttempt } from "@/lib/storage";
import { User, Quiz, Question } from "@/types";
import { v4 as uuidv4 } from "uuid";
import {
  Brain,
  ArrowLeft,
  CheckCircle2,
  XCircle,
  Loader2,
  Trophy,
} from "lucide-react";

export default function TakeQuizPage() {
  const router = useRouter();
  const params = useParams();
  const quizId = params.id as string;

  const [user, setUser] = useState<User | null>(null);
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [answers, setAnswers] = useState<number[]>([]);
  const [showFeedback, setShowFeedback] = useState(false);
  const [isFinished, setIsFinished] = useState(false);
  const [score, setScore] = useState(0);
  const [startTime] = useState(Date.now());
  const [difficultyProgression, setDifficultyProgression] = useState<
    ("easy" | "medium" | "hard")[]
  >([]);

  useEffect(() => {
    const currentUser = getCurrentUser();
    if (!currentUser) {
      router.push("/login");
      return;
    }
    setUser(currentUser);

    const found = getQuizById(quizId);
    if (!found) {
      router.push("/dashboard");
      return;
    }
    setQuiz(found);
    setDifficultyProgression(found.questions.map((q) => q.difficulty));
  }, [quizId, router]);

  const currentQuestion: Question | undefined = quiz?.questions[currentIndex];

  const handleSelect = (index: number) => {
    if (showFeedback) return;
    setSelected(index);
  };

  const handleSubmitAnswer = () => {
    if (selected === null || !currentQuestion) return;

    const newAnswers = [...answers, selected];
    setAnswers(newAnswers);
    setShowFeedback(true);
  };

  const handleNext = () => {
    if (!quiz || !currentQuestion) return;

    if (currentIndex + 1 >= quiz.questions.length) {
      // Finish
      const correctCount = answers.reduce((acc, ans, idx) => {
        return acc + (ans === quiz.questions[idx].correctAnswer ? 1 : 0);
      }, 0) + (selected === currentQuestion.correctAnswer ? 1 : 0);

      const finalScore = Math.round((correctCount / quiz.questions.length) * 100);
      const timeTaken = Math.round((Date.now() - startTime) / 1000);

      const allAnswers = [...answers];
      if (selected !== null) allAnswers.push(selected);

      const attempt = {
        id: uuidv4(),
        quizId: quiz.id,
        userId: user!.id,
        answers: allAnswers,
        score: finalScore,
        totalQuestions: quiz.questions.length,
        correctCount,
        difficultyProgression,
        completedAt: new Date().toISOString(),
        timeTaken,
      };

      saveAttempt(attempt);
      setScore(finalScore);
      setIsFinished(true);
    } else {
      setCurrentIndex((prev) => prev + 1);
      setSelected(null);
      setShowFeedback(false);
    }
  };

  if (!user || !quiz || !currentQuestion) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (isFinished) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
        <div className="bg-white rounded-2xl border border-slate-200 p-8 max-w-md w-full text-center shadow-lg">
          <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-5">
            <Trophy className="w-8 h-8 text-blue-600" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900 mb-2">Quiz Completed!</h1>
          <p className="text-slate-600 mb-6">{quiz.title}</p>

          <div className="text-5xl font-bold mb-2 text-blue-600">{score}%</div>
          <p className="text-slate-500 mb-8">
            You got {Math.round((score / 100) * quiz.questions.length)} out of{" "}
            {quiz.questions.length} correct
          </p>

          <div className="flex flex-col gap-3">
            <Link
              href="/dashboard"
              className="py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition"
            >
              Back to Dashboard
            </Link>
            <button
              onClick={() => window.location.reload()}
              className="py-3 bg-slate-100 text-slate-700 rounded-lg font-medium hover:bg-slate-200 transition"
            >
              Retake Quiz
            </button>
          </div>
        </div>
      </div>
    );
  }

  const isCorrect = selected === currentQuestion.correctAnswer;
  const progress = ((currentIndex + 1) / quiz.questions.length) * 100;

  return (
    <div className="min-h-screen bg-slate-50">
      <nav className="bg-white border-b border-slate-200 sticky top-0 z-40">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link
            href="/dashboard"
            className="flex items-center gap-2 text-slate-600 hover:text-slate-900"
          >
            <ArrowLeft className="w-5 h-5" />
            Exit
          </Link>
          <div className="flex items-center gap-2">
            <Brain className="w-5 h-5 text-blue-600" />
            <span className="font-medium text-slate-800 text-sm">{quiz.title}</span>
          </div>
          <span className="text-sm text-slate-500">
            {currentIndex + 1}/{quiz.questions.length}
          </span>
        </div>
      </nav>

      {/* Progress */}
      <div className="h-1.5 bg-slate-200">
        <div
          className="h-full bg-blue-600 transition-all duration-300"
          style={{ width: `${progress}%` }}
        />
      </div>

      <main className="max-w-3xl mx-auto px-4 py-8">
        <div className="mb-4 flex items-center gap-2">
          <span
            className={`px-2.5 py-1 rounded-full text-xs font-medium ${
              currentQuestion.difficulty === "easy"
                ? "bg-green-100 text-green-700"
                : currentQuestion.difficulty === "medium"
                ? "bg-amber-100 text-amber-700"
                : "bg-red-100 text-red-700"
            }`}
          >
            {currentQuestion.difficulty.toUpperCase()}
          </span>
          <span className="text-sm text-slate-500">{currentQuestion.topic}</span>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-6 md:p-8 shadow-sm">
          <h2 className="text-xl font-semibold text-slate-900 mb-6 leading-relaxed">
            {currentQuestion.question}
          </h2>

          <div className="space-y-3 mb-8">
            {currentQuestion.options.map((option, idx) => {
              let style =
                "border-slate-200 hover:border-blue-300 hover:bg-blue-50 cursor-pointer";

              if (showFeedback) {
                if (idx === currentQuestion.correctAnswer) {
                  style = "border-green-400 bg-green-50";
                } else if (idx === selected && !isCorrect) {
                  style = "border-red-400 bg-red-50";
                } else {
                  style = "border-slate-200 opacity-60";
                }
              } else if (selected === idx) {
                style = "border-blue-500 bg-blue-50 ring-2 ring-blue-200";
              }

              return (
                <button
                  key={idx}
                  onClick={() => handleSelect(idx)}
                  disabled={showFeedback}
                  className={`w-full text-left px-5 py-3.5 rounded-xl border-2 transition ${style}`}
                >
                  <span className="font-medium text-slate-500 mr-3">
                    {String.fromCharCode(65 + idx)}.
                  </span>
                  <span className="text-slate-800">{option}</span>
                </button>
              );
            })}
          </div>

          {showFeedback && (
            <div
              className={`mb-6 p-4 rounded-xl flex items-start gap-3 ${
                isCorrect
                  ? "bg-green-50 border border-green-200"
                  : "bg-red-50 border border-red-200"
              }`}
            >
              {isCorrect ? (
                <CheckCircle2 className="w-5 h-5 text-green-600 shrink-0 mt-0.5" />
              ) : (
                <XCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
              )}
              <div>
                <p
                  className={`font-semibold ${
                    isCorrect ? "text-green-800" : "text-red-800"
                  }`}
                >
                  {isCorrect ? "Correct!" : "Incorrect"}
                </p>
                <p className="text-sm text-slate-700 mt-1">
                  {currentQuestion.explanation}
                </p>
              </div>
            </div>
          )}

          <div className="flex justify-end">
            {!showFeedback ? (
              <button
                onClick={handleSubmitAnswer}
                disabled={selected === null}
                className="px-6 py-2.5 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Submit Answer
              </button>
            ) : (
              <button
                onClick={handleNext}
                className="px-6 py-2.5 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition"
              >
                {currentIndex + 1 >= quiz.questions.length
                  ? "Finish Quiz"
                  : "Next Question"}
              </button>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
