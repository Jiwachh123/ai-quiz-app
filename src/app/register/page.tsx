"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  registerUser,
  getCurrentUser,
  isEmailRegistered,
} from "@/lib/auth";
import {
  Brain,
  Loader2,
  User as UserIcon,
  Mail,
  Lock,
  Eye,
  EyeOff,
  CheckCircle2,
  AlertCircle,
  KeyRound,
  ArrowLeft,
} from "lucide-react";

export default function RegisterPage() {
  const router = useRouter();
  const [step, setStep] = useState<"details" | "otp">("details");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

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

  const sendRegistrationOtp = async () => {
    const res = await fetch("/api/auth/send-otp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: email.trim(),
        name: name.trim(),
        purpose: "register",
      }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Could not send verification OTP.");

    setOtpToken(data.otpToken);
    setOtpNotice(data.message);
    setDemoOtpHint(data.demoOtp || null);
  };

  const handleDetailsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!name.trim()) {
      setError("Please enter your full name.");
      return;
    }
    if (password.length < 8) {
      setError("Password must be at least 8 characters long.");
      return;
    }
    if (isEmailRegistered(email)) {
      setError("This email is already registered. Please sign in instead.");
      return;
    }

    setLoading(true);
    try {
      await sendRegistrationOtp();
      setStep("otp");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Could not send verification OTP."
      );
    } finally {
      setLoading(false);
    }
  };

  const handleOtpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          otp: otpInput.trim(),
          otpToken,
        }),
      });
      const data = await res.json();

      if (!res.ok || !data.verified) {
        setError(data.error || "Invalid OTP. Please try again.");
        setLoading(false);
        return;
      }

      const result = await registerUser(name, email, password);
      if (result.success && result.user) {
        router.push("/dashboard");
      } else {
        setError(result.message);
        setLoading(false);
      }
    } catch {
      setError("OTP verification failed. Please try again.");
      setLoading(false);
    }
  };

  const handleResendOtp = async () => {
    if (loading) return;
    setError("");
    setLoading(true);
    try {
      await sendRegistrationOtp();
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
            {step === "details"
              ? "Create Account (Email OTP Verification Required)"
              : "Step 2: Verify Your Email with OTP"}
          </p>
        </div>

        {error && (
          <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/30 text-red-400 p-3.5 rounded-xl mb-5 text-sm">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {step === "details" ? (
          <form onSubmit={handleDetailsSubmit} className="space-y-5">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
                Full Name
              </label>
              <div className="relative">
                <UserIcon className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  required
                  placeholder="Enter your full name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-xl text-white text-sm outline-none transition"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
                Student Email (Verified via OTP)
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
                Password must be at least 8 characters long.
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
                "Send Verification OTP to Email"
              )}
            </button>
          </form>
        ) : (
          <form onSubmit={handleOtpSubmit} className="space-y-5">
            <div className="p-3.5 rounded-xl bg-indigo-500/10 border border-indigo-500/30 text-xs text-indigo-200 space-y-1.5">
              <p>{otpNotice}</p>
              {demoOtpHint && (
                <p className="font-mono text-amber-300 font-bold">
                  Demo OTP (Email API not configured): {demoOtpHint}
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
                "Verify Email & Create Account"
              )}
            </button>

            <div className="flex items-center justify-between text-xs pt-2">
              <button
                type="button"
                onClick={() => {
                  setStep("details");
                  setError("");
                  setOtpInput("");
                }}
                className="text-slate-400 hover:text-white flex items-center gap-1"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                Edit Email
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

        <div className="mt-6 pt-6 border-t border-slate-800 text-center text-sm text-slate-400">
          Already have an account?{" "}
          <Link
            href="/login"
            className="text-indigo-400 hover:text-indigo-300 font-semibold"
          >
            Student Sign In
          </Link>
        </div>
      </div>
    </div>
  );
}
