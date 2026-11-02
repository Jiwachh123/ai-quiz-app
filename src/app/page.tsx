"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import Link from "next/link";
import { Brain, BookOpen, Users, BarChart3, Zap, Shield } from "lucide-react";

export default function HomePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const user = getCurrentUser();
    if (user) {
      router.push(user.role === "teacher" ? "/teacher" : "/dashboard");
    } else {
      setLoading(false);
    }
  }, [router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      {/* Navbar */}
      <nav className="bg-white border-b border-slate-200 sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Brain className="w-8 h-8 text-blue-600" />
            <span className="text-xl font-bold text-slate-800">AI Quiz Master</span>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="px-4 py-2 text-slate-700 hover:text-blue-600 font-medium transition"
            >
              Login
            </Link>
            <Link
              href="/register"
              className="px-5 py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition shadow-sm"
            >
              Get Started
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="max-w-6xl mx-auto px-4 py-20 text-center">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-blue-50 text-blue-700 rounded-full text-sm font-medium mb-6">
          <Zap className="w-4 h-4" />
          Powered by Google Gemini AI
        </div>
        <h1 className="text-4xl md:text-6xl font-bold text-slate-900 mb-6 leading-tight">
          Learn Smarter with<br />
          <span className="text-blue-600">AI-Powered Quizzes</span>
        </h1>
        <p className="text-lg text-slate-600 max-w-2xl mx-auto mb-10">
          Adaptive difficulty, instant explanations, teacher dashboards, and personalized learning — all in one platform.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            href="/register"
            className="px-8 py-3.5 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 transition shadow-lg shadow-blue-200"
          >
            Start Learning Free
          </Link>
          <Link
            href="/login"
            className="px-8 py-3.5 bg-white text-slate-700 border border-slate-300 rounded-xl font-semibold hover:bg-slate-50 transition"
          >
            Login to Dashboard
          </Link>
        </div>
      </section>

      {/* Features */}
      <section className="bg-white py-20 border-y border-slate-200">
        <div className="max-w-6xl mx-auto px-4">
          <h2 className="text-3xl font-bold text-center text-slate-900 mb-12">
            Why Choose AI Quiz Master?
          </h2>
          <div className="grid md:grid-cols-3 gap-8">
            <FeatureCard
              icon={<Zap className="w-6 h-6 text-blue-600" />}
              title="Adaptive Difficulty"
              description="Questions get harder or easier based on your performance so you always learn at the right level."
            />
            <FeatureCard
              icon={<Brain className="w-6 h-6 text-blue-600" />}
              title="AI Question Generation"
              description="Generate unlimited high-quality quizzes on any topic in seconds using Google Gemini."
            />
            <FeatureCard
              icon={<Users className="w-6 h-6 text-blue-600" />}
              title="Teacher Panel"
              description="Create quizzes for your class, track student progress, and identify weak areas easily."
            />
            <FeatureCard
              icon={<BarChart3 className="w-6 h-6 text-blue-600" />}
              title="Smart Analytics"
              description="See your strong and weak topics with detailed performance insights over time."
            />
            <FeatureCard
              icon={<BookOpen className="w-6 h-6 text-blue-600" />}
              title="Instant Explanations"
              description="Every question comes with clear explanations so you understand the concept, not just the answer."
            />
            <FeatureCard
              icon={<Shield className="w-6 h-6 text-blue-600" />}
              title="Role-Based Access"
              description="Separate experiences for Students and Teachers with secure login."
            />
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="max-w-6xl mx-auto px-4 py-20 text-center">
        <h2 className="text-3xl font-bold text-slate-900 mb-4">
          Ready to transform how you learn?
        </h2>
        <p className="text-slate-600 mb-8">
          Join now and experience the future of personalized education.
        </p>
        <Link
          href="/register"
          className="inline-block px-8 py-3.5 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 transition shadow-lg shadow-blue-200"
        >
          Create Free Account
        </Link>
      </section>

      <footer className="border-t border-slate-200 py-8 text-center text-slate-500 text-sm">
        © 2026 AI Quiz Master • Built with Next.js & Google Gemini
      </footer>
    </div>
  );
}

function FeatureCard({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="p-6 rounded-2xl border border-slate-200 hover:border-blue-200 hover:shadow-md transition bg-slate-50/50">
      <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center mb-4">
        {icon}
      </div>
      <h3 className="text-lg font-semibold text-slate-900 mb-2">{title}</h3>
      <p className="text-slate-600 text-sm leading-relaxed">{description}</p>
    </div>
  );
}
