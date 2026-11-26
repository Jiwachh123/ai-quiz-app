"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { getLeaderboard } from "@/lib/storage";
import { LeaderboardEntry, ExamMode } from "@/types";
import { ArrowLeft, Award, Trophy, Flame } from "lucide-react";

export default function LeaderboardPage() {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [filterMode, setFilterMode] = useState<"all" | ExamMode>("all");
  const [currentUserId, setCurrentUserId] = useState<string | undefined>(undefined);

  useEffect(() => {
    const u = getCurrentUser();
    setCurrentUserId(u?.id);
    setEntries(getLeaderboard(u?.id, filterMode));
  }, [filterMode]);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <nav className="bg-slate-900/80 backdrop-blur-md border-b border-slate-800 sticky top-0 z-40">
        <div className="max-w-5xl mx-auto px-4 py-3.5 flex items-center justify-between">
          <Link
            href={currentUserId ? "/dashboard" : "/"}
            className="flex items-center gap-2 text-slate-300 hover:text-white text-sm"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back</span>
          </Link>
          <div className="flex items-center gap-2">
            <Award className="w-5 h-5 text-emerald-400" />
            <span className="font-bold text-white">Adaptive Quiz Leaderboard</span>
          </div>
          <div className="w-16" />
        </div>
      </nav>

      <main className="max-w-5xl mx-auto px-4 py-8 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-extrabold text-white flex items-center gap-2">
              <Trophy className="w-6 h-6 text-amber-400" />
              <span>Top Performers</span>
            </h1>
            <p className="text-xs text-slate-400 mt-1">
              Ranked by points earned from correct answers, completed quizzes, and highest adaptive difficulty tier reached.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {(["all", "custom", "syllabus"] as const).map((m) => (
              <button
                key={m}
                onClick={() => setFilterMode(m)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold uppercase border transition ${
                  filterMode === m
                    ? "bg-indigo-600 border-indigo-500 text-white"
                    : "bg-slate-900 border-slate-800 text-slate-400 hover:text-white"
                }`}
              >
                {m === "syllabus" ? "Image / Text" : m}
              </button>
            ))}
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-950/60 text-[11px] uppercase tracking-wider text-slate-400">
                  <th className="py-3.5 px-4">Rank</th>
                  <th className="py-3.5 px-4">Student</th>
                  <th className="py-3.5 px-4 text-right">Quizzes</th>
                  <th className="py-3.5 px-4 text-right">Accuracy</th>
                  <th className="py-3.5 px-4 text-right">Best Score</th>
                  <th className="py-3.5 px-4 text-center">Max Level</th>
                  <th className="py-3.5 px-4 text-right">Points</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80 text-sm">
                {entries.map((e, idx) => (
                  <tr
                    key={e.userId}
                    className={
                      e.isCurrentUser
                        ? "bg-indigo-500/15"
                        : "hover:bg-slate-800/40 transition"
                    }
                  >
                    <td className="py-3.5 px-4 font-bold text-slate-300">
                      #{idx + 1}
                    </td>
                    <td className="py-3.5 px-4 font-semibold text-white">
                      {e.name}{" "}
                      {e.isCurrentUser && (
                        <span className="ml-1.5 text-[10px] px-2 py-0.5 rounded-full bg-indigo-500 text-white">
                          You
                        </span>
                      )}
                      {e.isBenchmark && (
                        <span className="ml-1.5 text-[10px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-400">
                          Benchmark
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-right text-slate-300">
                      {e.totalQuizzes}
                    </td>
                    <td className="py-3.5 px-4 text-right text-emerald-400 font-semibold">
                      {e.overallAccuracy}%
                    </td>
                    <td className="py-3.5 px-4 text-right text-slate-300">
                      {e.bestScore}%
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <span className="text-[11px] font-bold uppercase px-2.5 py-0.5 rounded-full bg-purple-500/15 text-purple-300 border border-purple-500/30">
                        {e.highestDifficulty}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right font-extrabold text-amber-400">
                      <span className="inline-flex items-center gap-1">
                        <Flame className="w-3.5 h-3.5" />
                        {e.points}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
}
