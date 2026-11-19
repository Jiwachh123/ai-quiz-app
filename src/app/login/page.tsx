"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { loginUser, getCurrentUser } from "@/lib/auth";
import {
  Brain,
  Loader2,
  Lock,
  Mail,
  Eye,
  EyeOff,
  CheckCircle2,
  AlertCircle,
  Sparkles,
} from "lucide-react";

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const user = getCurrentUser();
    if (user) {
      router.push("/dashboard");
      return;
    }
    const errParam = searchParams.get("error");
    if (errParam === "google_not_configured") {
      setError(
        "Google Sign-In needs GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in .env.local."
      );
    } else if (errParam === "google_failed") {
      setError("Google Sign-In failed. Please try again.");
    } else if (errParam === "google_cancelled") {
      setError("Google Sign-In was cancelled.");
    }
  }, [router, searchParams]);

  const isMinEight = password.length >= 8;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (password.length < 8) {
      setError("Password must be at least 8 characters long.");
      return;
    }

    setLoading(true);
    const result = await loginUser(email, password);
    setLoading(false);

    if (result.success && result.user) {
      router.push("/dashboard");
    } else {
      setError(result.message);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950 p-4 relative overflow-hidden">
      <div className="absolute -top-32 -left-32 w-96 h-96 bg-indigo-600/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-32 -right-32 w-96 h-96 bg-purple-600/20 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md bg-slate-900/90 backdrop-blur-xl rounded-2xl p-8 border border-slate-800 shadow-2xl text-white relative z-10">
        <div className="flex flex-col items-center text-center mb-6">
          <div className="p-3 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 shadow-lg shadow-indigo-500/30 mb-3">
            <Brain className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold bg-gradient-to-r from-white to-slate-300 bg-clip-text text-transparent">
            Adaptive Quiz Application
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Sign in to access your saved quiz history & weak-area analytics
          </p>
        </div>

        {error && (
          <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/30 text-red-400 p-3.5 rounded-xl mb-5 text-sm">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Direct Google Sign-In Button */}
        <a
          href="/api/auth/google"
          className="w-full flex items-center justify-center gap-3 py-3 px-4 bg-white hover:bg-slate-100 text-slate-900 rounded-xl font-semibold text-sm shadow transition mb-5"
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24">
            <path
              fill="#4285F4"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            />
            <path
              fill="#34A853"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="#FBBC05"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
            />
            <path
              fill="#EA4335"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
            />
          </svg>
          <span>Continue with Google</span>
        </a>

        <div className="relative flex items-center justify-center mb-5">
          <div className="border-t border-slate-800 w-full" />
          <span className="bg-slate-900 px-3 text-xs text-slate-500 uppercase">
            or with email
          </span>
          <div className="border-t border-slate-800 w-full" />
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
              Student Email
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="email"
                required
                placeholder="student@university.edu"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-xl text-white text-sm outline-none transition"
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400">
                Password
              </label>
              <Link
                href="/forgot-password"
                className="text-xs text-indigo-400 hover:text-indigo-300 font-medium"
              >
                Forgot Password?
              </Link>
            </div>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type={showPassword ? "text" : "password"}
                required
                minLength={8}
                placeholder="At least 8 characters"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-10 pr-10 py-3 bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-xl text-white text-sm outline-none transition"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
              >
                {showPassword ? (
                  <EyeOff className="w-4 h-4" />
                ) : (
                  <Eye className="w-4 h-4" />
                )}
              </button>
            </div>
            <p className="text-xs text-slate-500 mt-1.5 flex items-center gap-1.5">
              <CheckCircle2
                className={`w-3.5 h-3.5 ${
                  isMinEight ? "text-emerald-400" : "text-slate-600"
                }`}
              />
              Minimum 8 characters required ({password.length} entered).
            </p>
          </div>

          <button
            type="submit"
            disabled={loading || !isMinEight}
            className="w-full py-3 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 disabled:opacity-50 rounded-xl font-semibold text-sm shadow-lg shadow-indigo-600/25 transition"
          >
            {loading ? (
              <Loader2 className="animate-spin mx-auto h-5 w-5" />
            ) : (
              "Sign In"
            )}
          </button>
        </form>

        <div className="mt-6 pt-5 border-t border-slate-800 space-y-3 text-center text-sm">
          <p className="text-slate-400">
            Don&apos;t have an account?{" "}
            <Link
              href="/register"
              className="text-indigo-400 hover:text-indigo-300 font-semibold"
            >
              Create Account (Verify with OTP)
            </Link>
          </p>
          <div className="pt-2">
            <Link
              href="/quiz/create"
              className="w-full inline-flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-slate-950 border border-slate-800 hover:border-slate-700 text-slate-300 text-xs font-medium transition"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>Don&apos;t need history? Take Quiz as Guest (No Login)</span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-slate-950">
          <Loader2 className="w-10 h-10 animate-spin text-indigo-400" />
        </div>
      }
    >
      <LoginContent />
    </Suspense>
  );
}
