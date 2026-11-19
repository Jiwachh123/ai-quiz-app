"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { loginOrRegisterGoogleUser } from "@/lib/auth";
import { Loader2, AlertCircle } from "lucide-react";
import Link from "next/link";

function GoogleSuccessContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [error, setError] = useState("");

  useEffect(() => {
    const token = searchParams.get("token");
    if (!token) {
      setError("Missing Google login token.");
      return;
    }

    fetch("/api/auth/google/session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token }),
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.email) {
          loginOrRegisterGoogleUser(data.name || "Student", data.email);
          router.replace("/dashboard");
        } else {
          setError(data.error || "Could not complete Google Sign-In.");
        }
      })
      .catch(() => setError("Could not complete Google Sign-In."));
  }, [router, searchParams]);

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950 p-4 text-white">
        <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-2xl p-6 text-center space-y-4">
          <AlertCircle className="w-10 h-10 text-rose-400 mx-auto" />
          <p className="text-sm text-rose-300">{error}</p>
          <Link
            href="/login"
            className="inline-block px-5 py-2.5 rounded-xl bg-indigo-600 text-white text-sm font-semibold"
          >
            Back to Login
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-slate-950 text-white gap-3">
      <Loader2 className="w-10 h-10 animate-spin text-indigo-400" />
      <p className="text-sm text-slate-300">Signing you in with Google...</p>
    </div>
  );
}

export default function GoogleSuccessPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-slate-950">
          <Loader2 className="w-10 h-10 animate-spin text-indigo-400" />
        </div>
      }
    >
      <GoogleSuccessContent />
    </Suspense>
  );
}
