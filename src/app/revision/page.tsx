"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import {
  getRevisionCardsByUser,
  getDueRevisionCards,
  recordRevisionReview,
} from "@/lib/storage";
import { User, RevisionCard } from "@/types";
import {
  Brain,
  ArrowLeft,
  Layers,
  CheckCircle2,
  XCircle,
  Clock,
  RotateCcw,
} from "lucide-react";

const BOX_LABELS: Record<number, string> = {
  1: "Box 1 (Every 1 Day)",
  2: "Box 2 (Every 3 Days)",
  3: "Box 3 (Every 7 Days)",
  4: "Box 4 (Every 14 Days)",
  5: "Box 5 (Mastered • 30 Days)",
};

export default function SmartRevisionPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [allCards, setAllCards] = useState<RevisionCard[]>([]);
  const [dueCards, setDueCards] = useState<RevisionCard[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [selectedOpt, setSelectedOpt] = useState<number | null>(null);
  const [revealed, setRevealed] = useState(false);

  const loadCards = (userId: string) => {
    setAllCards(getRevisionCardsByUser(userId));
    setDueCards(getDueRevisionCards(userId));
  };

  useEffect(() => {
    const u = getCurrentUser();
    if (!u) {
      router.push("/login");
      return;
    }
    setUser(u);
    loadCards(u.id);
  }, [router]);

  const currentCard = dueCards[activeIndex];

  const handleCheck = () => {
    if (selectedOpt === null || !currentCard) return;
    setRevealed(true);
  };

  const handleNext = () => {
    if (!currentCard || !user || selectedOpt === null) return;
    const isCorrect = selectedOpt === currentCard.question.correctAnswer;
    recordRevisionReview(currentCard.id, isCorrect);
    setSelectedOpt(null);
    setRevealed(false);
    loadCards(user.id);
    setActiveIndex(0);
  };

  if (!user) return null;

  const uniqueMistakeTopics = Array.from(new Set(allCards.map((c) => c.subtopic || c.topic)));

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <nav className="bg-slate-900/80 backdrop-blur-md border-b border-slate-800 sticky top-0 z-40">
        <div className="max-w-4xl mx-auto px-4 py-3.5 flex items-center justify-between">
          <Link
            href="/dashboard"
            className="flex items-center gap-2 text-slate-300 hover:text-white text-sm"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Dashboard</span>
          </Link>
          <div className="flex items-center gap-2">
            <Layers className="w-5 h-5 text-amber-400" />
            <span className="font-bold text-white">Smart Revision System</span>
          </div>
          <span className="text-xs px-2.5 py-1 rounded-full bg-amber-500/15 text-amber-300 border border-amber-500/30">
            {dueCards.length} Due Today
          </span>
        </div>
      </nav>

      <main className="max-w-4xl mx-auto px-4 py-8 space-y-6">
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 text-center">
            <p className="text-2xl font-extrabold text-amber-400">{dueCards.length}</p>
            <p className="text-xs text-slate-400">Due for Review Now</p>
          </div>
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 text-center">
            <p className="text-2xl font-extrabold text-indigo-400">{allCards.length}</p>
            <p className="text-xs text-slate-400">Total Mistake Cards</p>
          </div>
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 text-center">
            <p className="text-2xl font-extrabold text-emerald-400">
              {allCards.filter((c) => c.box >= 4).length}
            </p>
            <p className="text-xs text-slate-400">Mastered (Box 4-5)</p>
          </div>
        </div>

        {/* Active Spaced Repetition Practice Card */}
        {currentCard ? (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 md:p-8 space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
              <span className="px-2.5 py-1 rounded-lg bg-amber-500/15 text-amber-300 border border-amber-500/30 font-semibold">
                {BOX_LABELS[currentCard.box] || "Box 1"}
              </span>
              <span className="text-slate-400">
                Topic: <strong className="text-white">{currentCard.subtopic}</strong> • Missed{" "}
                {currentCard.timesWrong}x
              </span>
            </div>

            <h2 className="text-lg font-bold text-white">
              {currentCard.question.question}
            </h2>

            <div className="space-y-2.5">
              {currentCard.question.options.map((opt, idx) => {
                const isRight = revealed && idx === currentCard.question.correctAnswer;
                const isPicked = selectedOpt === idx;
                return (
                  <button
                    key={idx}
                    disabled={revealed}
                    onClick={() => setSelectedOpt(idx)}
                    className={`w-full text-left p-3.5 rounded-xl border text-sm transition flex items-center justify-between ${
                      isRight
                        ? "border-emerald-500 bg-emerald-500/15 text-emerald-200"
                        : revealed && isPicked
                        ? "border-rose-500 bg-rose-500/15 text-rose-200"
                        : isPicked
                        ? "border-indigo-500 bg-indigo-500/20 text-white"
                        : "border-slate-800 bg-slate-950 hover:border-slate-700 text-slate-200"
                    }`}
                  >
                    <span>
                      <strong>{String.fromCharCode(65 + idx)}.</strong> {opt}
                    </span>
                    {revealed && isRight && (
                      <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                    )}
                    {revealed && isPicked && !isRight && (
                      <XCircle className="w-5 h-5 text-rose-400 shrink-0" />
                    )}
                  </button>
                );
              })}
            </div>

            {revealed && (
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-300 space-y-1.5">
                <p
                  className={`font-bold text-sm ${
                    selectedOpt === currentCard.question.correctAnswer
                      ? "text-emerald-400"
                      : "text-rose-400"
                  }`}
                >
                  {selectedOpt === currentCard.question.correctAnswer
                    ? `✓ Promoted to Box ${Math.min(5, currentCard.box + 1)}! Next spaced review scheduled automatically.`
                    : "✗ Reset to Box 1 for tomorrow's spaced repetition review."}
                </p>
                <p>{currentCard.question.explanation}</p>
              </div>
            )}

            {revealed ? (
              <button
                onClick={handleNext}
                className="w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-sm"
              >
                Save Spaced Repetition Progress & Next Card →
              </button>
            ) : (
              <button
                onClick={handleCheck}
                disabled={selectedOpt === null}
                className="w-full py-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-sm disabled:opacity-50"
              >
                Check Answer
              </button>
            )}
          </div>
        ) : (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-10 text-center space-y-4">
            <Brain className="w-12 h-12 text-emerald-400 mx-auto" />
            <h2 className="text-xl font-bold text-white">All Caught Up on Spaced Repetition!</h2>
            <p className="text-sm text-slate-400 max-w-md mx-auto">
              Every question you miss or mark Low Confidence in any adaptive quiz is automatically queued here using Leitner Spaced Repetition (1d → 3d → 7d → 14d → 30d).
            </p>
            <Link
              href="/quiz/create"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold"
            >
              <span>Take a New Adaptive Quiz</span>
            </Link>
          </div>
        )}

        {/* Recommended Practice Topics from Past Mistakes */}
        {uniqueMistakeTopics.length > 0 && (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-3">
            <h3 className="font-bold text-white text-sm flex items-center gap-2">
              <RotateCcw className="w-4 h-4 text-amber-400" />
              <span>Auto-Recommended Topics From Your Previous Mistakes</span>
            </h3>
            <div className="flex flex-wrap gap-2">
              {uniqueMistakeTopics.map((t) => (
                <Link
                  key={t}
                  href={`/quiz/create?topic=${encodeURIComponent(t)}&weakArea=true`}
                  className="px-3.5 py-2 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 text-amber-300 text-xs font-semibold transition"
                >
                  Practice &ldquo;{t}&rdquo; Quiz →
                </Link>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
