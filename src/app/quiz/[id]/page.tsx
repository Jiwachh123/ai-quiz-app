"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import {
  getQuizById,
  saveAttempt,
  buildQuizAnalysis,
  updateQuestionInQuiz,
  getAttemptsByQuiz,
} from "@/lib/storage";
import { User, Quiz, Question, QuizAttempt } from "@/types";
import { v4 as uuidv4 } from "uuid";
import {
  Brain,
  ArrowLeft,
  CheckCircle2,
  XCircle,
  Trophy,
  RotateCcw,
  ShieldCheck,
  AlertTriangle,
  Target,
} from "lucide-react";

export default function TakeQuizPage() {
  const router = useRouter();
  const params = useParams();
  const quizId = params.id as string;

  const [user, setUser] = useState<User | null>(null);
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [pastAttempts, setPastAttempts] = useState<QuizAttempt[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [answers, setAnswers] = useState<number[]>([]);
  const [showFeedback, setShowFeedback] = useState(false);
  const [isFinished, setIsFinished] = useState(false);
  const [completedAttempt, setCompletedAttempt] = useState<QuizAttempt | null>(
    null
  );
  const [startTime, setStartTime] = useState(Date.now());
  const [disputing, setDisputing] = useState(false);
  const [disputeMessage, setDisputeMessage] = useState<string | null>(null);

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
    setPastAttempts(getAttemptsByQuiz(quizId, currentUser.id));
  }, [quizId, router]);

  const currentQuestion: Question | undefined = quiz?.questions[currentIndex];

  const handleSelect = (index: number) => {
    if (showFeedback) return;
    setSelected(index);
  };

  const handleSubmitAnswer = () => {
    if (selected === null || !currentQuestion) return;
    setShowFeedback(true);
    setDisputeMessage(null);
  };

  const handleDisputeQuestion = async () => {
    if (!quiz || !currentQuestion || disputing) return;
    setDisputing(true);
    setDisputeMessage(null);

    try {
      const res = await fetch("/api/verify-question", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question: currentQuestion.question,
          options: currentQuestion.options,
          currentCorrectAnswer: currentQuestion.correctAnswer,
          userSelectedAnswer: selected,
          explanation: currentQuestion.explanation,
        }),
      });
      const audit = await res.json();
      if (!res.ok) throw new Error(audit.error || "Verification failed");

      if (audit.changed) {
        updateQuestionInQuiz(quiz.id, currentQuestion.id, {
          correctAnswer: audit.verifiedCorrectAnswer,
          explanation: audit.verificationExplanation,
        });

        const updatedQuestions = quiz.questions.map((q) =>
          q.id === currentQuestion.id
            ? {
                ...q,
                correctAnswer: audit.verifiedCorrectAnswer,
                explanation: audit.verificationExplanation,
              }
            : q
        );
        setQuiz({ ...quiz, questions: updatedQuestions });
        setDisputeMessage(
          `AI Arbitrator updated the saved answer key to Option ${String.fromCharCode(
            65 + audit.verifiedCorrectAnswer
          )} (Confidence: ${audit.confidence}%).`
        );
      } else {
        setDisputeMessage(
          `AI Arbitrator confirmed Option ${String.fromCharCode(
            65 + audit.verifiedCorrectAnswer
          )} is accurate (Confidence: ${audit.confidence}%).`
        );
      }
    } catch {
      setDisputeMessage("Could not verify with AI Arbitrator at this moment.");
    } finally {
      setDisputing(false);
    }
  };

  const handleNext = () => {
    if (!quiz || !currentQuestion || selected === null || !user) return;

    const updatedAnswers = [...answers, selected];
    setAnswers(updatedAnswers);

    if (currentIndex + 1 >= quiz.questions.length) {
      const correctCount = quiz.questions.reduce((acc, q, idx) => {
        return acc + (updatedAnswers[idx] === q.correctAnswer ? 1 : 0);
      }, 0);

      const finalScore = Math.round((correctCount / quiz.questions.length) * 100);
      const timeTaken = Math.round((Date.now() - startTime) / 1000);
      const analysis = buildQuizAnalysis(
        quiz.questions,
        updatedAnswers,
        quiz.topic
      );

      const attempt: QuizAttempt = {
        id: uuidv4(),
        quizId: quiz.id,
        quizTitle: quiz.title,
        topic: quiz.topic,
        userId: user.id,
        answers: updatedAnswers,
        score: finalScore,
        totalQuestions: quiz.questions.length,
        correctCount,
        difficultyProgression: quiz.questions.map((q) => q.difficulty),
        completedAt: new Date().toISOString(),
        timeTaken,
        questionsSnapshot: quiz.questions,
        analysis,
      };

      saveAttempt(attempt);
      setCompletedAttempt(attempt);
      setIsFinished(true);
    } else {
      setCurrentIndex((prev) => prev + 1);
      setSelected(null);
      setShowFeedback(false);
      setDisputeMessage(null);
    }
  };

  const handleRetakeImmediately = () => {
    if (!user) return;
    setPastAttempts(getAttemptsByQuiz(quizId, user.id));
    setCurrentIndex(0);
    setSelected(null);
    setAnswers([]);
    setShowFeedback(false);
    setIsFinished(false);
    setCompletedAttempt(null);
    setStartTime(Date.now());
  };

  if (!user || !quiz || !currentQuestion) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-500"></div>
      </div>
    );
  }

  if (isFinished && completedAttempt) {
    const previousBest =
      pastAttempts.length > 0
        ? Math.max(...pastAttempts.map((a) => a.score))
        : null;

    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 py-10 px-4">
        <div className="max-w-3xl mx-auto space-y-6">
          <div className="bg-slate-900 rounded-2xl border border-slate-800 p-8 text-center shadow-xl">
            <div className="w-16 h-16 bg-indigo-500/15 border border-indigo-500/30 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Trophy className="w-8 h-8 text-indigo-400" />
            </div>
            <h1 className="text-2xl font-bold text-white mb-1">
              Quiz Attempt Completed!
            </h1>
            <p className="text-slate-400 text-sm mb-6">{quiz.title}</p>

            <div className="flex items-center justify-center gap-8 mb-6">
              <div>
                <div className="text-4xl font-extrabold text-indigo-400">
                  {completedAttempt.score}%
                </div>
                <p className="text-xs text-slate-400 mt-1">Current Score</p>
              </div>
              {previousBest !== null && (
                <>
                  <div className="h-10 w-px bg-slate-800" />
                  <div>
                    <div className="text-2xl font-bold text-emerald-400">
                      {previousBest}%
                    </div>
                    <p className="text-xs text-slate-400 mt-1">
                      Previous Best ({pastAttempts.length} prior attempts)
                    </p>
                  </div>
                </>
              )}
            </div>

            <div className="p-4 rounded-xl bg-indigo-500/10 border border-indigo-500/30 text-left mb-6">
              <p className="text-xs font-semibold uppercase tracking-wider text-indigo-300 mb-1">
                Quiz Analysis & Weak-Area Summary
              </p>
              <p className="text-sm text-slate-200">
                {completedAttempt.analysis.recommendation}
              </p>
            </div>

            <div className="flex flex-wrap justify-center gap-3">
              <button
                onClick={handleRetakeImmediately}
                className="inline-flex items-center gap-2 px-5 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-semibold text-sm transition"
              >
                <RotateCcw className="w-4 h-4" />
                <span>Reattempt Quiz Again</span>
              </button>
              {completedAttempt.analysis.weakAreas.length > 0 && (
                <Link
                  href={`/quiz/create?topic=${encodeURIComponent(
                    completedAttempt.analysis.weakAreas[0]
                  )}&weakArea=true`}
                  className="inline-flex items-center gap-2 px-5 py-3 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-xl font-semibold text-sm transition"
                >
                  <Target className="w-4 h-4" />
                  <span>
                    Practice Weak Area ({completedAttempt.analysis.weakAreas[0]})
                  </span>
                </Link>
              )}
              <Link
                href="/dashboard"
                className="inline-flex items-center gap-2 px-5 py-3 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl font-medium text-sm transition"
              >
                <span>Back to Dashboard</span>
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const progress = ((currentIndex + 1) / quiz.questions.length) * 100;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <nav className="bg-slate-900/80 backdrop-blur-md border-b border-slate-800 sticky top-0 z-40">
        <div className="max-w-3xl mx-auto px-4 py-3.5 flex items-center justify-between">
          <Link
            href="/dashboard"
            className="flex items-center gap-2 text-slate-300 hover:text-white text-sm"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Exit to Dashboard</span>
          </Link>
          <div className="flex items-center gap-2">
            <Brain className="w-5 h-5 text-indigo-400" />
            <span className="font-semibold text-white text-sm">{quiz.title}</span>
          </div>
          <span className="text-xs font-mono text-slate-400">
            {currentIndex + 1} / {quiz.questions.length}
          </span>
        </div>
      </nav>

      <main className="max-w-3xl mx-auto px-4 py-10">
        <div className="bg-slate-900 rounded-2xl border border-slate-800 p-6 md:p-8 shadow-xl">
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs text-slate-400">
              Question {currentIndex + 1} of {quiz.questions.length} •{" "}
              <span className="text-indigo-300">
                {currentQuestion.subtopic || quiz.topic}
              </span>
            </span>
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                <ShieldCheck className="w-3.5 h-3.5" />
                Verified Question
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold uppercase bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                {currentQuestion.difficulty}
              </span>
            </div>
          </div>

          <div className="h-2 bg-slate-800 rounded-full mb-8 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>

          <h2 className="text-xl font-bold text-white mb-6">
            {currentQuestion.question}
          </h2>

          <div className="space-y-3">
            {currentQuestion.options.map((option, index) => {
              const isCorrect =
                showFeedback && index === currentQuestion.correctAnswer;
              const isSelected = selected === index;

              return (
                <button
                  key={index}
                  disabled={showFeedback}
                  onClick={() => handleSelect(index)}
                  className={`w-full text-left p-4 rounded-xl border transition flex items-center justify-between ${
                    isCorrect
                      ? "border-emerald-500 bg-emerald-500/15 text-emerald-200"
                      : showFeedback && isSelected
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
                  {showFeedback && isCorrect && (
                    <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                  )}
                  {showFeedback && isSelected && !isCorrect && (
                    <XCircle className="w-5 h-5 text-rose-400 shrink-0" />
                  )}
                </button>
              );
            })}
          </div>

          {showFeedback && (
            <div className="mt-6 p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
              <div className="flex items-center justify-between">
                <p
                  className={`font-bold text-sm ${
                    selected === currentQuestion.correctAnswer
                      ? "text-emerald-400"
                      : "text-rose-400"
                  }`}
                >
                  {selected === currentQuestion.correctAnswer
                    ? "✓ Correct!"
                    : "✗ Incorrect"}
                </p>
                <button
                  onClick={handleDisputeQuestion}
                  disabled={disputing}
                  className="inline-flex items-center gap-1.5 text-xs text-amber-400 hover:text-amber-300 font-medium"
                >
                  <AlertTriangle className="w-3.5 h-3.5" />
                  <span>
                    {disputing
                      ? "Re-verifying with AI..."
                      : "Verify / Dispute Answer Key"}
                  </span>
                </button>
              </div>
              <p className="text-sm text-slate-300">
                {currentQuestion.explanation}
              </p>
              {disputeMessage && (
                <div className="p-2.5 rounded-lg bg-indigo-500/15 border border-indigo-500/30 text-xs text-indigo-200">
                  {disputeMessage}
                </div>
              )}
            </div>
          )}

          {showFeedback ? (
            <button
              onClick={handleNext}
              className="w-full mt-6 py-3.5 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white rounded-xl font-semibold transition"
            >
              {currentIndex + 1 >= quiz.questions.length
                ? "Finish & View Quiz Analysis"
                : "Next Question →"}
            </button>
          ) : (
            <button
              onClick={handleSubmitAnswer}
              disabled={selected === null}
              className="w-full mt-6 py-3.5 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white rounded-xl font-semibold disabled:opacity-50 transition"
            >
              Submit Answer
            </button>
          )}
        </div>
      </main>
    </div>
  );
}
