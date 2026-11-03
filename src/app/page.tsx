"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import Link from "next/link";
import {
  Brain,
  Sparkles,
  ShieldCheck,
  BarChart3,
  RotateCcw,
  Target,
  ArrowRight,
  Lock,
  CheckCircle2,
} from "lucide-react";

export default function HomePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const user = getCurrentUser();
    if (user) {
      router.push("/dashboard");
    } else {
      setLoading(false);
    }
  }, [router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white relative overflow-hidden">
      {/* Ambient background glow */}
      <div className="absolute -top-40 -left-40 w-96 h-96 bg-indigo-600/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute top-1/3 -right-40 w-96 h-96 bg-purple-600/20 rounded-full blur-3xl pointer-events-none" />

      {/* Header */}
      <header className="border-b border-slate-800/80 bg-slate-950/70 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 shadow-lg shadow-indigo-500/25">
              <Brain className="h-6 w-6 text-white" />
            </div>
            <span className="text-xl md:text-2xl font-bold bg-gradient-to-r from-white via-indigo-200 to-purple-300 bg-clip-text text-transparent">
              Adaptive Quiz Application
            </span>
          </div>
          <div className="flex items-center space-x-3">
            <Link
              href="/login"
              className="px-4 py-2 rounded-xl text-sm font-medium text-slate-300 hover:text-white hover:bg-slate-800/60 transition"
            >
              Student Sign In
            </Link>
            <Link
              href="/register"
              className="px-5 py-2.5 rounded-xl text-sm font-semibold bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 shadow-lg shadow-indigo-600/30 transition"
            >
              Get Started
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="max-w-6xl mx-auto px-6 pt-20 pb-16 text-center relative z-10">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/30 text-indigo-300 text-xs font-medium mb-8">
          <Sparkles className="w-3.5 h-3.5" />
          <span>AI-Verified Adaptive Assessment Engine • Student Portal</span>
        </div>

        <h1 className="text-4xl md:text-6xl font-extrabold max-w-4xl mx-auto leading-tight tracking-tight">
          Master Any Subject with{" "}
          <span className="bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
            Adaptive Quiz Application
          </span>
        </h1>

        <p className="mt-6 text-lg md:text-xl text-slate-400 max-w-2xl mx-auto leading-relaxed">
          Real-time difficulty adaptation, dual-layer AI answer key verification,
          permanent quiz history, and one-click weak-area practice quizzes.
        </p>

        <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link
            href="/login"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-4 rounded-2xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 font-semibold text-white shadow-xl shadow-indigo-600/30 transition"
          >
            <span>Sign In to Start Quiz</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
          <Link
            href="/register"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-4 rounded-2xl bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-200 font-medium transition"
          >
            <Lock className="w-4 h-4 text-indigo-400" />
            <span>Create Student Account</span>
          </Link>
        </div>

        <p className="mt-4 text-xs text-slate-500">
          * Mandatory Student Authentication with strict 8-character security password
        </p>
      </section>

      {/* Feature Grid */}
      <section className="max-w-6xl mx-auto px-6 py-12 grid md:grid-cols-2 lg:grid-cols-4 gap-6 relative z-10">
        <div className="p-6 rounded-2xl bg-slate-900/70 border border-slate-800/80 hover:border-indigo-500/40 transition">
          <div className="w-11 h-11 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center mb-4">
            <Target className="w-5 h-5 text-indigo-400" />
          </div>
          <h3 className="font-bold text-lg text-white mb-2">
            Weak-Area Targeting
          </h3>
          <p className="text-sm text-slate-400 leading-relaxed">
            Automatically analyzes every attempt by subtopic and generates custom
            remedial quizzes on your weak areas on demand.
          </p>
        </div>

        <div className="p-6 rounded-2xl bg-slate-900/70 border border-slate-800/80 hover:border-purple-500/40 transition">
          <div className="w-11 h-11 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center mb-4">
            <ShieldCheck className="w-5 h-5 text-purple-400" />
          </div>
          <h3 className="font-bold text-lg text-white mb-2">
            AI Answer Verification
          </h3>
          <p className="text-sm text-slate-400 leading-relaxed">
            Every AI question undergoes an automated second-opinion audit plus
            live student dispute re-verification to eliminate wrong answer keys.
          </p>
        </div>

        <div className="p-6 rounded-2xl bg-slate-900/70 border border-slate-800/80 hover:border-emerald-500/40 transition">
          <div className="w-11 h-11 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mb-4">
            <RotateCcw className="w-5 h-5 text-emerald-400" />
          </div>
          <h3 className="font-bold text-lg text-white mb-2">
            Permanent Save & Reattempt
          </h3>
          <p className="text-sm text-slate-400 leading-relaxed">
            All completed quizzes—questions, options, verified answers, and
            explanations—are permanently saved to your account for unlimited retakes.
          </p>
        </div>

        <div className="p-6 rounded-2xl bg-slate-900/70 border border-slate-800/80 hover:border-amber-500/40 transition">
          <div className="w-11 h-11 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center mb-4">
            <BarChart3 className="w-5 h-5 text-amber-400" />
          </div>
          <h3 className="font-bold text-lg text-white mb-2">
            Performance History
          </h3>
          <p className="text-sm text-slate-400 leading-relaxed">
            Track your historical scores, difficulty progression, and accuracy
            trends across every attempt and retake.
          </p>
        </div>
      </section>
    </div>
  );
}
