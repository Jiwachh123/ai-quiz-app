"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  verifyUserCredentials,
  completeOtpLogin,
  getCurrentUser,
} from "@/lib/auth";
import { User } from "@/types";
import {
  Brain,
  Loader2,
  Lock,
  Mail,
  Eye,
  EyeOff,
  CheckCircle2,
  AlertCircle,
  KeyRound,
  Sparkles,
  ArrowLeft,
} from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [step, setStep] = useState<"credentials" | "otp">("credentials");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const [pendingUser, setPendingUser] = useState<User | null>(null);
  const [otpToken, setOtpToken] = useState("");
  const [otpInput, setOtpInput] = useState("");
  const [otpNotice, setOtpNotice] = useState("");
  const [demoOtpHint, setDemoOtpHint] = useState<string | null>(null);

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const user = getCurrentUser();
    if (user) {
      router.push("/dashboard");
    }
  }, [router]);

  const isMinEight = password.length >= 8;

  const sendOtpToEmail = async (targetUser: User) => {
    const res = await fetch("/api/auth/send-otp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: targetUser.email, name: targetUser.name }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Could not send OTP");

    setOtpToken(data.otpToken);
    setOtpNotice(data.message);
    setDemoOtpHint(data.demoOtp || null);
  };

  const handleCredentialsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (password.length < 8) {
      setError("Password must be at least 8 characters long.");
      return;
    }

    setLoading(true);
    try {
      const result = await verifyUserCredentials(email, password);
      if (!result.success || !result.user) {
        setError(result.message);
        setLoading(false);
        return;
      }

      setPendingUser(result.user);
      await sendOtpToEmail(result.user);
      setStep("otp");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not initiate OTP login.");
    } finally {
      setLoading(false);
    }
  };

  const handleOtpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pendingUser) return;
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: pendingUser.email,
          otp: otpInput.trim(),
          otpToken,
        }),
      });
      const data = await res.json();

      if (!res.ok || !data.verified) {
        setError(data.error || "Invalid OTP code.");
        setLoading(false);
        return;
      }

      completeOtpLogin(pendingUser);
      router.push("/dashboard");
    } catch {
      setError("OTP verification failed. Please try again.");
      setLoading(false);
    }
  };

  const handleResendOtp = async () => {
    if (!pendingUser || loading) return;
    setError("");
    setLoading(true);
    try {
      await sendOtpToEmail(pendingUser);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not resend OTP.");
    } finally {
      setLoading(false);
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
            {step === "credentials"
              ? "Sign in to save quiz history permanently"
              : "Step 2: Verify Email OTP"}
          </p>
        </div>

        {error && (
          <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/30 text-red-400 p-3.5 rounded-xl mb-5 text-sm">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {step === "credentials" ? (
          <form onSubmit={handleCredentialsSubmit} className="space-y-5">
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
                  Password (Minimum 8 Characters)
                </label>
                <span
                  className={`text-xs font-mono px-2 py-0.5 rounded-full ${
                    isMinEight
                      ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30"
                      : "bg-amber-500/15 text-amber-400 border border-amber-500/30"
                  }`}
                >
                  {password.length} / 8+ chars
                </span>
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
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <p className="text-xs text-slate-500 mt-1.5 flex items-center gap-1.5">
                <CheckCircle2
                  className={`w-3.5 h-3.5 ${
                    isMinEight ? "text-emerald-400" : "text-slate-600"
                  }`}
                />
                Minimum 8 characters required.
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
                "Continue & Send Email OTP"
              )}
            </button>
          </form>
        ) : (
          <form onSubmit={handleOtpSubmit} className="space-y-5">
            <div className="p-3.5 rounded-xl bg-indigo-500/10 border border-indigo-500/30 text-xs text-indigo-200 space-y-1.5">
              <p>{otpNotice}</p>
              {demoOtpHint && (
                <p className="font-mono text-amber-300 font-bold">
                  Demo OTP (No SMTP/Resend key set): {demoOtpHint}
                </p>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
                Enter 6-Digit Email OTP
              </label>
              <div className="relative">
                <KeyRound className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  required
                  maxLength={6}
                  placeholder="6-digit OTP"
                  value={otpInput}
                  onChange={(e) => setOtpInput(e.target.value.replace(/\D/g, ""))}
                  className="w-full pl-10 pr-4 py-3 bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-xl text-white text-center tracking-[0.4em] font-mono text-lg outline-none transition"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || otpInput.length !== 6}
              className="w-full py-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 disabled:opacity-50 rounded-xl font-semibold text-sm shadow-lg transition"
            >
              {loading ? (
                <Loader2 className="animate-spin mx-auto h-5 w-5" />
              ) : (
                "Verify OTP & Sign In"
              )}
            </button>

            <div className="flex items-center justify-between text-xs pt-2">
              <button
                type="button"
                onClick={() => {
                  setStep("credentials");
                  setError("");
                  setOtpInput("");
                }}
                className="text-slate-400 hover:text-white flex items-center gap-1"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                Back
              </button>
              <button
                type="button"
                onClick={handleResendOtp}
                disabled={loading}
                className="text-indigo-400 hover:text-indigo-300 font-medium"
              >
                Resend OTP
              </button>
            </div>
          </form>
        )}

        <div className="mt-6 pt-5 border-t border-slate-800 space-y-3 text-center text-sm">
          <p className="text-slate-400">
            Don&apos;t have an account?{" "}
            <Link
              href="/register"
              className="text-indigo-400 hover:text-indigo-300 font-semibold"
            >
              Create Account
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
