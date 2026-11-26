"use client";

import { useEffect } from "react";

const COLORS = ["#34d399", "#818cf8", "#fbbf24", "#f472b6", "#38bdf8"];
const PIECES = 36;

/** Confetti and a popping tick, shown briefly after a right answer. */
export default function CorrectCelebration({ onDone }: { onDone: () => void }) {
  useEffect(() => {
    const timer = setTimeout(onDone, 1600);
    return () => clearTimeout(timer);
    // Run once per celebration
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="pointer-events-none fixed inset-0 z-50 overflow-hidden" aria-hidden="true">
      {Array.from({ length: PIECES }, (_, i) => (
        <span
          key={i}
          className="confetti-piece"
          style={{
            left: `${(i * 100) / PIECES}%`,
            backgroundColor: COLORS[i % COLORS.length],
            animationDelay: `${(i % 6) * 0.05}s`,
          }}
        />
      ))}
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="celebrate-badge">✓ Correct!</div>
      </div>
    </div>
  );
}
