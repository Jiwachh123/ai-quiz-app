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
      <div className="absolute -top-40 -left-40 w-96 h-96 bg-indigo-600/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute top-1/3 -right-40 w-96 h-96 bg-purple-600/20 rounded-full blur-3xl pointer-events-none" />

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
              href="/quiz/create"
              className="hidden sm:inline-block px-4 py-2 rounded-xl text-sm font-medium text-amber-300 hover:text-amber-200 hover:bg-amber-500/10 transition"
            >
              Guest Quiz
            </Link>
            <Link
              href="/login"
              className="px-4 py-2 rounded-xl text-sm font-medium text-slate-300 hover:text-white hover:bg-slate-800/60 transition"
            >
              Sign In (OTP)
            </Link>
            <Link
              href="/register"
              className="px-5 py-2.5 rounded-xl text-sm font-semibold bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 shadow-lg shadow-indigo-600/30 transition"
            >
              Create Account
            </Link>
          </div>
        </div>
      </header>

      <section className="max-w-6xl mx-auto px-6 pt-20 pb-16 text-center relative z-10">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/30 text-indigo-300 text-xs font-medium mb-8">
          <Sparkles className="w-3.5 h-3.5" />
          <span>AI Adaptive Assessment • Guest Mode & OTP-Secured Student Accounts</span>
        </div>

        <h1 className="text-4xl md:text-6xl font-extrabold max-w-4xl mx-auto leading-tight tracking-tight">
          Master Any Subject with{" "}
          <span className="bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
            Adaptive Quiz Application
          </span>
        </h1>

        <p className="mt-6 text-lg md:text-xl text-slate-400 max-w-2xl mx-auto leading-relaxed">
          Take an instant quiz as a guest with zero login, or sign in with Email OTP to
          permanently save quizzes, track your improvement, and practice weak areas.
        </p>

        <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link
            href="/quiz/create"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-4 rounded-2xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 font-semibold text-white shadow-xl shadow-indigo-600/30 transition"
          >
            <Sparkles className="w-4 h-4" />
            <span>Take Quiz Without Login (Guest)</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
          <Link
            href="/login"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-4 rounded-2xl bg-slate-900 border border-slate-800 hover:border-indigo-500/50 text-slate-200 font-medium transition"
          >
            <Lock className="w-4 h-4 text-indigo-400" />
            <span>Sign In to Save History</span>
          </Link>
        </div>

        <p className="mt-4 text-xs text-slate-500">
          * Guest quizzes give instant analysis without saving history. Login (with Email OTP) saves all quizzes & progress permanently.
        </p>
      </section>

      <section className="max-w-6xl mx-auto px-6 py-12 grid md:grid-cols-2 lg:grid-cols-4 gap-6 relative z-10">
        <div className="p-6 rounded-2xl bg-slate-900/70 border border-slate-800/80">
          <div className="w-11 h-11 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center mb-4">
            <Target className="w-5 h-5 text-indigo-400" />
          </div>
          <h3 className="font-bold text-lg text-white mb-2">Weak-Area Targeting</h3>
          <p className="text-sm text-slate-400 leading-relaxed">
            Automatically analyzes logged-in attempts by subtopic and generates custom
            remedial quizzes on your weak areas on demand.
          </p>
        </div>

        <div className="p-6 rounded-2xl bg-slate-900/70 border border-slate-800/80">
          <div className="w-11 h-11 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center mb-4">
            <ShieldCheck className="w-5 h-5 text-purple-400" />
          </div>
          <h3 className="font-bold text-lg text-white mb-2">On-Demand AI Verification</h3>
          <p className="text-sm text-slate-400 leading-relaxed">
            Zero wasted API calls: click verify on any question you doubt and our AI
            Arbitrator checks and fixes the answer key live.
          </p>
        </div>

        <div className="p-6 rounded-2xl bg-slate-900/70 border border-slate-800/80">
          <div className="w-11 h-11 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mb-4">
            <RotateCcw className="w-5 h-5 text-emerald-400" />
          </div>
          <h3 className="font-bold text-lg text-white mb-2">Permanent Account History</h3>
          <p className="text-sm text-slate-400 leading-relaxed">
            Signed-in students get permanent storage of all questions, options,
            explanations, and unlimited quiz reattempts.
          </p>
        </div>

        <div className="p-6 rounded-2xl bg-slate-900/70 border border-slate-800/80">
          <div className="w-11 h-11 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center mb-4">
            <BarChart3 className="w-5 h-5 text-amber-400" />
          </div>
          <h3 className="font-bold text-lg text-white mb-2">Email OTP Security</h3>
          <p className="text-sm text-slate-400 leading-relaxed">
            Two-step student authentication with minimum 8-character passwords and
            6-digit Email OTP verification.
          </p>
        </div>
      </section>
    </div>
  );
}
