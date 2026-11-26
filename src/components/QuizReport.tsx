"use client";

import { QuizAttempt } from "@/types";
import { getInsights } from "@/lib/insights";

/** Key insights and topic-wise accuracy for one attempt. */
export function AnalysisInsights({ attempt }: { attempt: QuizAttempt }) {
  // Weakest topics first
  const topics = Object.entries(attempt.analysis.subtopicBreakdown || {}).sort(
    (a, b) => a[1].correct / a[1].total - b[1].correct / b[1].total
  );

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-5 text-left">
      <div>
        <h2 className="text-lg font-bold text-white mb-2">Key Insights</h2>
        <ul className="list-disc pl-5 space-y-1 text-sm text-slate-300">
          {getInsights(attempt).map((insight) => (
            <li key={insight}>{insight}</li>
          ))}
        </ul>
      </div>

      <div>
        <h2 className="text-lg font-bold text-white mb-3">Topic-wise Performance</h2>
        <div className="space-y-3">
          {topics.map(([topic, { correct, total }]) => {
            const percent = Math.round((correct / total) * 100);
            return (
              <div key={topic}>
                <div className="flex justify-between gap-3 text-xs text-slate-300 mb-1">
                  <span>{topic}</span>
                  <span className="shrink-0">
                    {correct}/{total} ({percent}%)
                  </span>
                </div>
                <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className={`h-full ${
                      percent >= 80
                        ? "bg-emerald-500"
                        : percent >= 60
                        ? "bg-amber-500"
                        : "bg-rose-500"
                    }`}
                    style={{ width: `${percent}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/** Every question with its options, the chosen answer and the explanation. */
export function QuestionReview({ attempt }: { attempt: QuizAttempt }) {
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4 text-left">
      <h2 className="text-lg font-bold text-white">Question-by-Question Review & Explanations</h2>
      {attempt.questionsSnapshot.map((q, idx) => {
        const userAnswer = attempt.answers[idx];
        const isCorrect = userAnswer === q.correctAnswer;
        const seconds = attempt.questionTimes?.[idx];

        return (
          <div
            key={q.id || idx}
            className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2"
          >
            <div className="flex items-center justify-between gap-3 text-xs text-slate-400">
              <span>
                Q{idx + 1} • {q.subtopic || q.topic} ({q.difficulty.toUpperCase()})
                {seconds ? ` • ${seconds}s` : ""}
              </span>
              <span
                className={`font-semibold ${isCorrect ? "text-emerald-400" : "text-rose-400"}`}
              >
                {isCorrect ? "✓ Correct" : "✗ Incorrect"}
              </span>
            </div>
            <p className="text-sm font-semibold text-white">{q.question}</p>
            <div className="grid sm:grid-cols-2 gap-2 pt-1">
              {q.options.map((option, i) => (
                <div
                  key={i}
                  className={`text-xs p-2.5 rounded-lg border ${
                    i === q.correctAnswer
                      ? "border-emerald-500/50 bg-emerald-500/10 text-emerald-200 font-medium"
                      : i === userAnswer
                      ? "border-rose-500/50 bg-rose-500/10 text-rose-200"
                      : "border-slate-800 text-slate-400"
                  }`}
                >
                  {String.fromCharCode(65 + i)}. {option}
                  {i === userAnswer && <span className="font-semibold"> (Your answer)</span>}
                </div>
              ))}
            </div>
            <p className="text-xs text-slate-300 bg-slate-900 p-2.5 rounded-lg border border-slate-800">
              <span className="font-semibold text-indigo-300">Explanation: </span>
              {q.explanation}
            </p>
          </div>
        );
      })}
    </div>
  );
}
