"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  isEmailRegistered,
  getUserNameByEmail,
  resetUserPassword,
} from "@/lib/auth";
import {
  Brain,
  Loader2,
  Mail,
  KeyRound,
  Lock,
  Eye,
  EyeOff,
  CheckCircle2,
  AlertCircle,
  ArrowLeft,
} from "lucide-react";

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [step, setStep] = useState<"email" | "otp" | "newPassword" | "done">("email");
  const [email, setEmail] = useState("");
  const [otpToken, setOtpToken] = useState("");
  const [otpInput, setOtpInput] = useState("");
  const [otpNotice, setOtpNotice] = useState("");
  const [demoOtpHint, setDemoOtpHint] = useState<string | null>(null);

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const isMinEight = newPassword.length >= 8;
  const passwordsMatch = newPassword === confirmPassword && newPassword.length >= 8;

  const sendResetOtp = async () => {
    const res = await fetch("/api/auth/send-otp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: email.trim(),
        name: getUserNameByEmail(email),
        purpose: "reset",
      }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Could not send reset OTP.");

    setOtpToken(data.otpToken);
    setOtpNotice(data.message);
    setDemoOtpHint(data.demoOtp || null);
  };

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!isEmailRegistered(email)) {
      setError("No account found with that email address.");
      return;
    }

    setLoading(true);
    try {
      await sendResetOtp();
      setStep("otp");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to send OTP.");
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
        setError(data.error || "Invalid OTP code.");
        setLoading(false);
        return;
      }

      setStep("newPassword");
    } catch {
      setError("OTP verification failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleNewPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (newPassword.length < 8) {
      setError("New password must be at least 8 characters long.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);
    const result = await resetUserPassword(email, newPassword);
    setLoading(false);

    if (result.success) {
      setStep("done");
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
            Reset Password
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            {step === "email" && "Enter your registered email to receive a reset OTP"}
            {step === "otp" && "Enter the 6-digit OTP sent to your email"}
            {step === "newPassword" && "Email verified! Create your new password"}
            {step === "done" && "Your password has been updated"}
          </p>
        </div>

        {error && (
          <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/30 text-red-400 p-3.5 rounded-xl mb-5 text-sm">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {step === "email" && (
          <form onSubmit={handleEmailSubmit} className="space-y-5">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
                Registered Email
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

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 disabled:opacity-50 rounded-xl font-semibold text-sm shadow-lg transition"
            >
              {loading ? (
                <Loader2 className="animate-spin mx-auto h-5 w-5" />
              ) : (
                "Send Verification OTP"
              )}
            </button>
          </form>
        )}

        {step === "otp" && (
          <form onSubmit={handleOtpSubmit} className="space-y-5">
            <div className="p-3.5 rounded-xl bg-indigo-500/10 border border-indigo-500/30 text-xs text-indigo-200 space-y-1.5">
              <p>{otpNotice}</p>
              {demoOtpHint && (
                <p className="font-mono text-amber-300 font-bold">
                  Demo OTP: {demoOtpHint}
                </p>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
                6-Digit OTP
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
                "Verify Email OTP"
              )}
            </button>

            <div className="flex items-center justify-between text-xs pt-2">
              <button
                type="button"
                onClick={() => {
                  setStep("email");
                  setError("");
                }}
                className="text-slate-400 hover:text-white flex items-center gap-1"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                Back
              </button>
              <button
                type="button"
                onClick={async () => {
                  setLoading(true);
                  try {
                    await sendResetOtp();
                  } finally {
                    setLoading(false);
                  }
                }}
                className="text-indigo-400 hover:text-indigo-300 font-medium"
              >
                Resend OTP
              </button>
            </div>
          </form>
        )}

        {step === "newPassword" && (
          <form onSubmit={handleNewPasswordSubmit} className="space-y-5">
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400">
                  New Password (Min 8 Chars)
                </label>
                <span
                  className={`text-xs font-mono px-2 py-0.5 rounded-full ${
                    isMinEight
                      ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30"
                      : "bg-amber-500/15 text-amber-400 border border-amber-500/30"
                  }`}
                >
                  {newPassword.length} / 8+
                </span>
              </div>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  minLength={8}
                  placeholder="Enter new password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
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
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
                Confirm New Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  minLength={8}
                  placeholder="Confirm new password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-xl text-white text-sm outline-none transition"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || !passwordsMatch}
              className="w-full py-3 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 disabled:opacity-50 rounded-xl font-semibold text-sm shadow-lg transition"
            >
              {loading ? (
                <Loader2 className="animate-spin mx-auto h-5 w-5" />
              ) : (
                "Save New Password"
              )}
            </button>
          </form>
        )}

        {step === "done" && (
          <div className="text-center space-y-5">
            <div className="w-14 h-14 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-8 h-8 text-emerald-400" />
            </div>
            <p className="text-sm text-slate-300">
              Your password has been reset successfully for{" "}
              <strong className="text-white">{email}</strong>.
            </p>
            <button
              onClick={() => router.push("/login")}
              className="w-full py-3 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 rounded-xl font-semibold text-sm shadow-lg transition"
            >
              Go to Sign In
            </button>
          </div>
        )}

        <div className="mt-6 pt-5 border-t border-slate-800 text-center text-sm text-slate-400">
          Remember your password?{" "}
          <Link
            href="/login"
            className="text-indigo-400 hover:text-indigo-300 font-semibold"
          >
            Back to Sign In
          </Link>
        </div>
      </div>
    </div>
  );
}
