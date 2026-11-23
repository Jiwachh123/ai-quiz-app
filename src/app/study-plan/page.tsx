"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import {
  calculateUserStats,
  getStudyPlanByUser,
  saveStudyPlan,
  toggleStudyPlanDayComplete,
} from "@/lib/storage";
import { User, StudyPlan, UserStats } from "@/types";
import { v4 as uuidv4 } from "uuid";
import {
  ArrowLeft,
  Calendar,
  Sparkles,
  Loader2,
  CheckCircle2,
  Circle,
  Clock,
  Play,
} from "lucide-react";

export default function StudyPlanPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [stats, setStats] = useState<UserStats | null>(null);
  const [plan, setPlan] = useState<StudyPlan | null>(null);
  const [targetExam, setTargetExam] = useState("GATE CSE & BEU 7th Sem");
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const u = getCurrentUser();
    if (!u) {
      router.push("/login");
      return;
    }
    setUser(u);
    setStats(calculateUserStats(u.id));
    setPlan(getStudyPlanByUser(u.id));
  }, [router]);

  const handleGeneratePlan = async () => {
    if (!user || !stats) return;
    setGenerating(true);
    setError("");

    try {
      const recentTopics = Array.from(
        new Set(stats.scoreHistory.slice(-6).map((s) => s.topic))
      );

      const res = await fetch("/api/study-plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentName: user.name,
          targetExam,
          overallAccuracy: stats.overallAccuracy,
          weakTopics: stats.weakTopics,
          strongTopics: stats.strongTopics,
          recentTopics,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not generate study plan");

      const newPlan: StudyPlan = {
        id: uuidv4(),
        userId: user.id,
        createdAt: new Date().toISOString(),
        summary: data.summary,
        targetExam,
        days: data.days,
      };
      saveStudyPlan(newPlan);
      setPlan(newPlan);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to generate plan.");
    } finally {
      setGenerating(false);
    }
  };

  const handleToggleDay = (dayNum: number) => {
    if (!user) return;
    const updated = toggleStudyPlanDayComplete(user.id, dayNum);
    if (updated) setPlan(updated);
  };

  if (!user || !stats) return null;

  const completedDays = plan ? plan.days.filter((d) => d.completed).length : 0;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <nav className="bg-slate-900/80 backdrop-blur-md border-b border-slate-800 sticky top-0 z-40">
        <div className="max-w-5xl mx-auto px-4 py-3.5 flex items-center justify-between">
          <Link
            href="/dashboard"
            className="flex items-center gap-2 text-slate-300 hover:text-white text-sm"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Dashboard</span>
          </Link>
          <div className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-purple-400" />
            <span className="font-bold text-white">AI 7-Day Study Plan Generator</span>
          </div>
          <div className="w-20" />
        </div>
      </nav>

      <main className="max-w-5xl mx-auto px-4 py-8 space-y-6">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div className="space-y-2 flex-1">
            <h1 className="text-xl font-bold text-white">
              Personalized 7-Day Study Plan
            </h1>
            <p className="text-xs text-slate-400">
              Built dynamically from your weak topics (
              <span className="text-amber-300">
                {stats.weakTopics.length > 0
                  ? stats.weakTopics.join(", ")
                  : "Core CSE Fundamentals"}
              </span>
              ) and current {stats.overallAccuracy}% overall accuracy.
            </p>
            <div className="pt-2 max-w-sm">
              <label className="block text-[11px] uppercase font-semibold text-slate-400 mb-1">
                Target Goal / Exam
              </label>
              <select
                value={targetExam}
                onChange={(e) => setTargetExam(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white outline-none"
              >
                <option value="GATE CSE">GATE CSE Examination</option>
                <option value="BEU B.Tech CSE Semester Exams">
                  BEU B.Tech CSE Semester Exams
                </option>
                <option value="GATE CSE & BEU 7th Sem">
                  GATE CSE &amp; BEU 7th Sem Combined
                </option>
                <option value="Software Engineering Interviews & DSA">
                  Software Engineering Interviews &amp; DSA
                </option>
              </select>
            </div>
          </div>

          <button
            onClick={handleGeneratePlan}
            disabled={generating}
            className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white text-sm font-semibold shadow-lg disabled:opacity-60 transition shrink-0"
          >
            {generating ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Generating 7-Day Plan...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                <span>{plan ? "Regenerate 7-Day Plan" : "Generate AI 7-Day Plan"}</span>
              </>
            )}
          </button>
        </div>

        {error && (
          <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs">
            {error}
          </div>
        )}

        {plan ? (
          <div className="space-y-4">
            <div className="p-5 rounded-2xl bg-indigo-500/10 border border-indigo-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <p className="text-xs font-bold uppercase text-indigo-300 mb-1">
                  Strategy Overview ({plan.targetExam})
                </p>
                <p className="text-sm text-slate-200">{plan.summary}</p>
              </div>
              <span className="px-3 py-1.5 rounded-xl bg-slate-950 border border-indigo-500/40 text-xs font-bold text-indigo-300 shrink-0">
                {completedDays} / 7 Days Completed
              </span>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              {plan.days.map((day) => (
                <div
                  key={day.day}
                  className={`p-5 rounded-2xl border transition space-y-3 ${
                    day.completed
                      ? "bg-emerald-950/20 border-emerald-500/40"
                      : "bg-slate-900 border-slate-800"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <span className="text-[11px] font-bold uppercase px-2 py-0.5 rounded bg-purple-500/15 text-purple-300 border border-purple-500/30">
                        Day {day.day}
                      </span>
                      <h3 className="font-bold text-white text-base mt-1.5">
                        {day.title}
                      </h3>
                    </div>
                    <button
                      onClick={() => handleToggleDay(day.day)}
                      className="text-slate-400 hover:text-emerald-400 transition"
                      title="Mark day complete"
                    >
                      {day.completed ? (
                        <CheckCircle2 className="w-6 h-6 text-emerald-400" />
                      ) : (
                        <Circle className="w-6 h-6" />
                      )}
                    </button>
                  </div>

                  <ul className="space-y-1.5 text-xs text-slate-300 list-disc pl-4">
                    {day.tasks.map((t, i) => (
                      <li key={i}>{t}</li>
                    ))}
                  </ul>

                  <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-xs">
                    <span className="text-slate-400 flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" />
                      {day.estimatedMinutes} mins
                    </span>
                    <Link
                      href={`/quiz/create?topic=${encodeURIComponent(
                        day.practiceQuizTopic
                      )}&weakArea=true`}
                      className="inline-flex items-center gap-1 text-indigo-400 hover:text-indigo-300 font-semibold"
                    >
                      <Play className="w-3.5 h-3.5" />
                      <span>Start Day {day.day} Quiz</span>
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-10 text-center space-y-3">
            <Calendar className="w-12 h-12 text-purple-400 mx-auto" />
            <h2 className="text-lg font-bold text-white">No Study Plan Generated Yet</h2>
            <p className="text-xs text-slate-400 max-w-md mx-auto">
              Click &ldquo;Generate AI 7-Day Plan&rdquo; above to create a customized daily roadmap targeting your weak areas and exam goals.
            </p>
          </div>
        )}
      </main>
    </div>
  );
}
