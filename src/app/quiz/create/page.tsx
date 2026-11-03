"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import {
  saveCompletedAdaptiveQuizAndAttempt,
  calculateUserStats,
} from "@/lib/storage";
import { User, QuizAttempt, Question } from "@/types";
import {
  Brain,
  Loader2,
  ArrowLeft,
  Sparkles,
  CheckCircle,
  XCircle,
  ShieldCheck,
  AlertTriangle,
  RotateCcw,
  Target,
  Trophy,
} from "lucide-react";

function CreateQuizContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [user, setUser] = useState<User | null>(null);
  const [weakTopics, setWeakTopics] = useState<string[]>([]);
  const [sessionToken, setSessionToken] = useState("");
  const [currentQuestion, setCurrentQuestion] = useState<any>(null);
  const [pendingQuestion, setPendingQuestion] = useState<any>(null);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [feedback, setFeedback] = useState<any>(null);
  const [answeredCount, setAnsweredCount] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [quizFinished, setQuizFinished] = useState(false);
  const [savedAttempt, setSavedAttempt] = useState<QuizAttempt | null>(null);
  const [checkingAnswer, setCheckingAnswer] = useState(false);
  const [disputing, setDisputing] = useState(false);
  const [disputeResult, setDisputeResult] = useState<string | null>(null);

  const [title, setTitle] = useState("");
  const [topic, setTopic] = useState("");
  const [description, setDescription] = useState("");
  const [count, setCount] = useState(5);
  const [difficulty, setDifficulty] = useState<"easy" | "medium" | "hard">("medium");
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState("");
  const [startTime, setStartTime] = useState<number>(Date.now());

  useEffect(() => {
    const currentUser = getCurrentUser();
    if (!currentUser) {
      router.push("/login");
      return;
    }
    setUser(currentUser);
    const stats = calculateUserStats(currentUser.id);
    setWeakTopics(stats.weakTopics || []);

    const paramTopic = searchParams.get("topic");
    const isWeakArea = searchParams.get("weakArea");
    if (paramTopic) {
      setTopic(paramTopic);
      if (isWeakArea) {
        setTitle(`Weak-Area Practice: ${paramTopic}`);
        setDescription(`Targeted adaptive practice session focusing on ${paramTopic}`);
      }
    }
  }, [router, searchParams]);

  const handleGenerate = async (overrideTopic?: string) => {
    const targetTopic = (overrideTopic ?? topic).trim();
    if (!targetTopic) {
      setError("Please enter a topic or select a weak area.");
      return;
    }

    setError("");
    setGenerating(true);
    setStartTime(Date.now());

    try {
      const response = await fetch("/api/adaptive-quiz/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic: targetTopic, count, difficulty }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Could not start adaptive quiz");
      }

      if (overrideTopic) setTopic(overrideTopic);
      setSessionToken(data.sessionToken);
      setCurrentQuestion(data.question);
      setSelectedAnswer(null);
      setFeedback(null);
      setDisputeResult(null);
      setAnsweredCount(0);
      setCorrectCount(0);
      setQuizFinished(false);
      setSavedAttempt(null);
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
    if (selectedAnswer === null || !currentQuestion || checkingAnswer || !user) {
      return;
    }

    setCheckingAnswer(true);
    setError("");
    setDisputeResult(null);

    try {
      const response = await fetch("/api/adaptive-quiz/answer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
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

      if (data.completed && data.completedQuizData) {
        const timeTaken = Math.round((Date.now() - startTime) / 1000);
        const { attempt } = saveCompletedAdaptiveQuizAndAttempt({
          userId: user.id,
          title: title.trim() || `${topic} Adaptive Quiz`,
          description,
          topic: data.completedQuizData.topic || topic,
          questions: data.completedQuizData.questions as Question[],
          answers: data.completedQuizData.answers as number[],
          timeTaken,
        });
        setSavedAttempt(attempt);
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
          )} (Confidence: ${audit.confidence}%). Your score has been adjusted!`
        );
      } else {
        setFeedback((prev: any) => ({
          ...prev,
          explanation: audit.verificationExplanation || prev.explanation,
        }));
        setDisputeResult(
          `AI Arbitrator re-verified and confirmed Option ${String.fromCharCode(
            65 + audit.verifiedCorrectAnswer
          )} is accurate (Confidence: ${audit.confidence}%).`
        );
      }
    } catch (err) {
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
    setFeedback(null);
    setDisputeResult(null);
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
      <nav className="bg-slate-900/80 backdrop-blur-md border-b border-slate-800 sticky top-0 z-40">
        <div className="max-w-4xl mx-auto px-4 py-3.5 flex items-center justify-between">
          <Link
            href="/dashboard"
            className="flex items-center gap-2 text-slate-300 hover:text-white text-sm font-medium"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Dashboard</span>
          </Link>
          <div className="flex items-center gap-2">
            <Brain className="w-6 h-6 text-indigo-400" />
            <span className="font-bold text-white">Adaptive Quiz Application</span>
          </div>
          <div className="w-20" />
        </div>
      </nav>

      {/* Post-Quiz Detailed Analysis Screen */}
      {quizFinished && savedAttempt ? (
        <main className="max-w-4xl mx-auto px-4 py-8 space-y-6">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 text-center">
            <div className="w-16 h-16 bg-indigo-500/15 border border-indigo-500/30 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Trophy className="w-8 h-8 text-indigo-400" />
            </div>
            <h1 className="text-3xl font-extrabold text-white">
              Quiz Permanently Saved & Analyzed!
            </h1>
            <p className="text-slate-400 text-sm mt-1">
              {savedAttempt.quizTitle} • Saved to your student account for future retakes
            </p>

            <div className="mt-6 flex items-center justify-center gap-8">
              <div>
                <p className="text-4xl font-extrabold text-indigo-400">
                  {savedAttempt.score}%
                </p>
                <p className="text-xs text-slate-400 mt-1">Final Score</p>
              </div>
              <div className="h-10 w-px bg-slate-800" />
              <div>
                <p className="text-2xl font-bold text-white">
                  {savedAttempt.correctCount} / {savedAttempt.totalQuestions}
                </p>
                <p className="text-xs text-slate-400 mt-1">Correct Answers</p>
              </div>
              <div className="h-10 w-px bg-slate-800" />
              <div>
                <p className="text-2xl font-bold text-white">
                  {savedAttempt.timeTaken}s
                </p>
                <p className="text-xs text-slate-400 mt-1">Time Taken</p>
              </div>
            </div>

            {/* Diagnostic Recommendation */}
            <div className="mt-6 p-4 rounded-xl bg-indigo-500/10 border border-indigo-500/30 text-left">
              <p className="text-xs font-semibold uppercase tracking-wider text-indigo-300 mb-1">
                AI Performance Diagnosis
              </p>
              <p className="text-sm text-slate-200">
                {savedAttempt.analysis.recommendation}
              </p>
            </div>

            {/* Difficulty & Subtopic Breakdown */}
            <div className="grid sm:grid-cols-3 gap-3 mt-6 text-left">
              {(["easy", "medium", "hard"] as const).map((diff) => {
                const stats = savedAttempt.analysis.difficultyBreakdown[diff];
                return (
                  <div
                    key={diff}
                    className="p-3.5 rounded-xl bg-slate-950 border border-slate-800"
                  >
                    <p className="text-xs uppercase font-semibold text-slate-400">
                      {diff} Difficulty
                    </p>
                    <p className="text-lg font-bold text-white mt-1">
                      {stats.correct} / {stats.total} Correct
                    </p>
                  </div>
                );
              })}
            </div>

            <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
              <Link
                href={`/quiz/${savedAttempt.quizId}`}
                className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold transition"
              >
                <RotateCcw className="w-4 h-4" />
                <span>Reattempt Saved Quiz</span>
              </Link>
              {savedAttempt.analysis.weakAreas.length > 0 && (
                <button
                  onClick={() => {
                    const weakTopic = savedAttempt.analysis.weakAreas[0];
                    setQuizFinished(false);
                    setCurrentQuestion(null);
                    handleGenerate(weakTopic);
                  }}
                  className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-sm font-semibold transition"
                >
                  <Target className="w-4 h-4" />
                  <span>
                    Practice Weak Area ({savedAttempt.analysis.weakAreas[0]})
                  </span>
                </button>
              )}
              <Link
                href="/dashboard"
                className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-sm font-medium transition"
              >
                <span>Go to Student Dashboard</span>
              </Link>
            </div>
          </div>

          {/* Complete Question-by-Question Review */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
            <h2 className="text-lg font-bold text-white">
              Saved Questions, Verified Answers & Explanations
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
                      Q{idx + 1} • {q.subtopic || q.topic} ({q.difficulty})
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
                    <span className="font-semibold text-indigo-300">
                      Verified Explanation:{" "}
                    </span>
                    {q.explanation}
                  </p>
                </div>
              );
            })}
          </div>
        </main>
      ) : currentQuestion ? (
        /* Active Adaptive Quiz Interface */
        <div className="max-w-3xl mx-auto px-4 py-10">
          <div className="bg-slate-900 rounded-2xl border border-slate-800 p-6 md:p-8 shadow-xl">
            <div className="flex flex-wrap justify-between items-center gap-2 mb-4">
              <span className="text-xs font-medium text-slate-400">
                Question {answeredCount + (feedback ? 0 : 1)} of {count} •{" "}
                <span className="text-indigo-300">
                  {currentQuestion.subtopic || topic}
                </span>
              </span>
              <div className="flex items-center gap-2">
                {currentQuestion.verification?.isVerified && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    AI Verified ({currentQuestion.verification.confidence}%)
                  </span>
                )}
                <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold uppercase bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                  {currentQuestion.difficulty}
                </span>
              </div>
            </div>

            <div className="h-2 bg-slate-800 rounded-full mb-8 overflow-hidden">
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

            {feedback && (
              <div className="mt-6 p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                <div className="flex items-center justify-between">
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

                {disputeResult && (
                  <div className="p-2.5 rounded-lg bg-indigo-500/15 border border-indigo-500/30 text-xs text-indigo-200">
                    {disputeResult}
                  </div>
                )}

                <div className="pt-2 flex items-center justify-between text-xs text-slate-400">
                  <span>
                    Current Score: {correctCount} / {answeredCount}
                  </span>
                  <span>
                    Next Question Difficulty:{" "}
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
        /* Quiz Configuration Form */
        <main className="max-w-3xl mx-auto px-4 py-8 space-y-6">
          {/* Quick One-Click Weak Areas Generator */}
          {weakTopics.length > 0 && (
            <div className="bg-slate-900 border border-amber-500/30 rounded-2xl p-5">
              <div className="flex items-center gap-2 text-amber-300 font-semibold text-sm mb-2">
                <Target className="w-4 h-4 text-amber-400" />
                <span>Demand a Weak-Area Targeted Quiz</span>
              </div>
              <p className="text-xs text-slate-400 mb-3">
                Click any weak area identified from your past quiz analyses to immediately populate a targeted practice session:
              </p>
              <div className="flex flex-wrap gap-2">
                {weakTopics.map((wt) => (
                  <button
                    key={wt}
                    type="button"
                    onClick={() => {
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

          <div className="bg-slate-900 rounded-2xl border border-slate-800 p-6 md:p-8 shadow-xl">
            <div className="flex items-center gap-2.5 mb-6">
              <Sparkles className="w-6 h-6 text-indigo-400" />
              <div>
                <h1 className="text-xl font-bold text-white">
                  Generate AI-Verified Adaptive Quiz
                </h1>
                <p className="text-xs text-slate-400">
                  Questions are verified by a 2-step AI auditor and saved permanently to your account on completion.
                </p>
              </div>
            </div>

            {error && (
              <div className="mb-5 p-3.5 bg-rose-500/10 text-rose-300 text-sm rounded-xl border border-rose-500/30">
                {error}
              </div>
            )}

            <div className="grid md:grid-cols-2 gap-5 mb-5">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
                  Topic or Subject *
                </label>
                <input
                  type="text"
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  placeholder="e.g. Operating Systems, DBMS, React"
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
                  {[5, 10, 15, 20, 25, 30].map((n) => (
                    <option key={n} value={n}>
                      {n} Questions
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-5 mb-6">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
                  Initial Difficulty
                </label>
                <select
                  value={difficulty}
                  onChange={(e) =>
                    setDifficulty(e.target.value as "easy" | "medium" | "hard")
                  }
                  className="w-full px-4 py-3 bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-xl text-white text-sm outline-none"
                >
                  <option value="easy">Easy</option>
                  <option value="medium">Medium</option>
                  <option value="hard">Hard</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
                  Quiz Title (Optional)
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Auto-named from topic"
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
                  <span>Generating & Auditing Questions with AI...</span>
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
