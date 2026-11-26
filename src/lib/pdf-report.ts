import { QuizAttempt, User, UserStats } from "@/types";
import { getInsights } from "@/lib/insights";

// The built-in PDF font only supports basic English characters, so spell out common symbols
const SYMBOLS: Record<string, string> = {
  "≤": "<=", "≥": ">=", "≠": "!=", "≈": "~=", "→": "->", "←": "<-", "⇒": "=>", "↔": "<->",
  "×": "x", "÷": "/", "−": "-", "–": "-", "—": "-", "‘": "'", "’": "'", "“": '"', "”": '"',
  "…": "...", "•": "-", "√": "sqrt", "∞": "infinity", "∑": "sum", "∈": " in ", "∪": " U ",
  "∩": " intersect ", "²": "^2", "³": "^3", "Θ": "Theta", "Ω": "Omega", "θ": "theta",
  "π": "pi", "λ": "lambda", "Δ": "Delta", "ε": "epsilon", "μ": "u", "α": "alpha", "β": "beta",
};

function toAscii(str: string): string {
  return String(str || "")
    .replace(/[^\x00-\x7F]/g, (char) => SYMBOLS[char] ?? "?")
    .replace(/[^\x20-\x7E]/g, " ");
}

function escapePdfText(str: string): string {
  return toAscii(str)
    .replace(/\\/g, "\\\\")
    .replace(/\(/g, "\\(")
    .replace(/\)/g, "\\)");
}

function wrapText(text: string, maxChars: number): string[] {
  // Very long words (code, formulas) are split so they do not run off the page
  const words = toAscii(text)
    .split(/\s+/)
    .flatMap((word) => word.match(new RegExp(`.{1,${Math.floor(maxChars * 0.7)}}`, "g")) || []);
  const lines: string[] = [];
  let current = "";
  for (const w of words) {
    if ((current + " " + w).trim().length > maxChars) {
      if (current) lines.push(current.trim());
      current = w;
    } else {
      current = (current + " " + w).trim();
    }
  }
  if (current) lines.push(current.trim());
  return lines.length > 0 ? lines : [""];
}

interface PdfLine {
  text: string;
  size: number;
  bold?: boolean;
  color?: [number, number, number]; // RGB 0..1
  spaceAfter?: number;
}

function buildMultiPagePdfBlob(lines: PdfLine[]): Blob {
  const pageWidth = 595; // A4 pt
  const pageHeight = 842;
  const marginX = 48;
  const topY = 790;
  const bottomY = 55;

  const pages: string[][] = [];
  let currentOps: string[] = [];
  let y = topY;

  const startNewPage = () => {
    if (currentOps.length > 0) {
      pages.push(currentOps);
    }
    currentOps = [];
    // Top subtle header bar
    currentOps.push("0.31 0.27 0.90 rg 0 822 595 20 re f");
    y = topY;
  };

  startNewPage();

  for (const line of lines) {
    const lineHeight = line.size + 5;
    if (y - lineHeight < bottomY) {
      startNewPage();
    }
    const fontKey = line.bold ? "/F2" : "/F1";
    const [r, g, b] = line.color || [0.1, 0.12, 0.18];
    currentOps.push(
      `BT ${fontKey} ${line.size} Tf ${r.toFixed(2)} ${g.toFixed(2)} ${b.toFixed(
        2
      )} rg ${marginX} ${y} Td (${escapePdfText(line.text)}) Tj ET`
    );
    y -= lineHeight + (line.spaceAfter || 0);
  }
  if (currentOps.length > 0) {
    pages.push(currentOps);
  }

  // Assemble PDF objects
  const objects: string[] = [];
  // Obj 1: Catalog
  // Obj 2: Pages
  // Obj 3: Font Regular (Helvetica)
  // Obj 4: Font Bold (Helvetica-Bold)
  // Obj 5+: Page + Content stream pairs

  const pageObjNumbers: number[] = [];
  const baseObjNum = 5;
  for (let i = 0; i < pages.length; i++) {
    pageObjNumbers.push(baseObjNum + i * 2);
  }

  objects.push("1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj");
  objects.push(
    `2 0 obj\n<< /Type /Pages /Kids [${pageObjNumbers
      .map((n) => `${n} 0 R`)
      .join(" ")}] /Count ${pages.length} >>\nendobj`
  );
  objects.push(
    "3 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj"
  );
  objects.push(
    "4 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>\nendobj"
  );

  pages.forEach((ops, idx) => {
    const pageNum = baseObjNum + idx * 2;
    const contentNum = pageNum + 1;
    // Add footer with page number
    ops.push(
      `BT /F1 8 Tf 0.45 0.48 0.55 rg ${marginX} 28 Td (Adaptive Quiz Application - Performance Report | Page ${
        idx + 1
      } of ${pages.length}) Tj ET`
    );
    const streamStr = ops.join("\n");
    objects.push(
      `${pageNum} 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pageWidth} ${pageHeight}] /Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> /Contents ${contentNum} 0 R >>\nendobj`
    );
    objects.push(
      `${contentNum} 0 obj\n<< /Length ${streamStr.length} >>\nstream\n${streamStr}\nendstream\nendobj`
    );
  });

  let pdf = "%PDF-1.4\n";
  const offsets: number[] = [0];
  for (const obj of objects) {
    offsets.push(pdf.length);
    pdf += obj + "\n";
  }

  const xrefStart = pdf.length;
  pdf += `xref\n0 ${objects.length + 1}\n`;
  pdf += "0000000000 65535 f \n";
  for (let i = 1; i < offsets.length; i++) {
    pdf += String(offsets[i]).padStart(10, "0") + " 00000 n \n";
  }
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefStart}\n%%EOF`;

  return new Blob([pdf], { type: "application/pdf" });
}

function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

export function downloadOverallPerformanceReportPdf(
  user: User,
  stats: UserStats,
  attempts: QuizAttempt[]
) {
  const lines: PdfLine[] = [];

  lines.push({
    text: "ADAPTIVE QUIZ APPLICATION",
    size: 18,
    bold: true,
    color: [0.31, 0.27, 0.9],
    spaceAfter: 2,
  });
  lines.push({
    text: "Comprehensive Student Performance Report",
    size: 13,
    bold: true,
    color: [0.15, 0.18, 0.25],
    spaceAfter: 8,
  });
  lines.push({
    text: `Student: ${user.name} (${user.email}) | Generated: ${new Date().toLocaleString()}`,
    size: 9,
    color: [0.4, 0.45, 0.52],
    spaceAfter: 12,
  });

  lines.push({ text: "1. EXECUTIVE SUMMARY", size: 12, bold: true, color: [0.2, 0.25, 0.6], spaceAfter: 4 });
  lines.push({ text: `Total Quizzes Attempted: ${stats.totalQuizzes}`, size: 10 });
  lines.push({ text: `Total Questions Answered: ${stats.totalQuestionsAnswered} (${stats.totalCorrectAnswers} Correct)`, size: 10 });
  lines.push({ text: `Overall Accuracy: ${stats.overallAccuracy}%`, size: 10 });
  lines.push({ text: `Highest Score: ${stats.bestScore}% | Average Score: ${stats.averageScore}%`, size: 10 });
  lines.push({ text: `Average Time per Question: ${stats.averageTimePerQuestion}s`, size: 10 });
  lines.push({
    text: `Performance Trend: ${stats.trendStatus.toUpperCase()} (${stats.improvementTrend >= 0 ? "+" : ""}${stats.improvementTrend}%)`,
    size: 10,
    spaceAfter: 10,
  });

  lines.push({ text: "2. DIFFICULTY-WISE PERFORMANCE", size: 12, bold: true, color: [0.2, 0.25, 0.6], spaceAfter: 4 });
  (["easy", "medium", "hard", "expert"] as const).forEach((d) => {
    const dp = stats.difficultyPerformance[d];
    lines.push({
      text: `  - ${d.toUpperCase()}: ${dp.correct}/${dp.total} correct (${dp.accuracy}%)`,
      size: 10,
    });
  });
  lines.push({ text: "", size: 6 });

  lines.push({ text: "3. TOPIC-WISE ANALYSIS", size: 12, bold: true, color: [0.2, 0.25, 0.6], spaceAfter: 4 });
  lines.push({
    text: `Strongest Topics: ${stats.strongTopics.length > 0 ? stats.strongTopics.join(", ") : "Keep practicing to unlock"}`,
    size: 10,
  });
  lines.push({
    text: `Weakest Topics (Focus Areas): ${stats.weakTopics.length > 0 ? stats.weakTopics.join(", ") : "None flagged yet"}`,
    size: 10,
    spaceAfter: 4,
  });
  Object.entries(stats.topicPerformance).forEach(([topic, data]) => {
    lines.push({
      text: `  - ${topic}: ${data.correct}/${data.attempted} (${data.accuracy}%)`,
      size: 9,
    });
  });
  lines.push({ text: "", size: 6 });

  lines.push({ text: "4. RECENT QUIZ HISTORY", size: 12, bold: true, color: [0.2, 0.25, 0.6], spaceAfter: 4 });
  attempts.slice(0, 12).forEach((a, idx) => {
    lines.push({
      text: `  ${idx + 1}. ${a.quizTitle} | Score: ${a.score}% (${a.correctCount}/${a.totalQuestions}) | ${new Date(
        a.completedAt
      ).toLocaleDateString()} | Avg Time: ${a.analysis?.averageTimePerQuestion || 0}s/q`,
      size: 9,
    });
  });
  lines.push({ text: "", size: 6 });

  lines.push({ text: "5. RECOMMENDATIONS", size: 12, bold: true, color: [0.2, 0.25, 0.6], spaceAfter: 4 });
  const recText =
    stats.weakTopics.length > 0
      ? `Prioritize spaced repetition revision and targeted practice quizzes on: ${stats.weakTopics.join(
          ", "
        )}. Maintain daily consistency using the AI 7-Day Study Plan.`
      : "Great consistency! Challenge yourself with Hard-to-Expert adaptive sessions to push mastery higher.";
  wrapText(recText, 88).forEach((l) => lines.push({ text: l, size: 10 }));

  const blob = buildMultiPagePdfBlob(lines);
  triggerDownload(
    blob,
    `Adaptive_Quiz_Performance_Report_${user.name.replace(/\s+/g, "_")}.pdf`
  );
}

export function downloadSingleQuizReportPdf(attempt: QuizAttempt, studentName: string) {
  const lines: PdfLine[] = [];
  const green: [number, number, number] = [0.02, 0.5, 0.3];
  const red: [number, number, number] = [0.75, 0.1, 0.2];

  const add = (text: string, style: Partial<PdfLine> = {}) => {
    const size = style.size ?? 10;
    const wrapped = wrapText(text, Math.floor(880 / size));
    wrapped.forEach((line, i) =>
      lines.push({
        ...style,
        size,
        text: line,
        spaceAfter: i === wrapped.length - 1 ? style.spaceAfter : 0,
      })
    );
  };
  const heading = (text: string) => {
    lines.push({ text: "", size: 6 });
    add(text, { size: 12, bold: true, color: [0.2, 0.25, 0.6], spaceAfter: 4 });
  };
  const percent = (correct: number, total: number) =>
    `${correct}/${total} (${Math.round((correct / total) * 100)}%)`;
  const { analysis } = attempt;

  add("QUIZ ANALYSIS REPORT", { size: 16, bold: true, color: [0.31, 0.27, 0.9], spaceAfter: 4 });
  add(`Quiz: ${attempt.quizTitle}`, { size: 11, bold: true });
  add(`Student: ${studentName} | Completed: ${new Date(attempt.completedAt).toLocaleString()}`, {
    size: 9,
    color: [0.4, 0.45, 0.52],
  });

  heading("SCORE & TIME");
  add(
    `Accuracy: ${attempt.score}% | Correct: ${attempt.correctCount}/${attempt.totalQuestions} | Not attempted: ${
      attempt.answers.filter((a) => a === -1).length
    } | Total time: ${attempt.timeTaken}s`
  );
  add(
    `Average per question: ${analysis.averageTimePerQuestion}s | Fastest: ${analysis.fastestTimeSec}s | Slowest: ${analysis.slowestTimeSec}s`
  );
  add(analysis.timeManagementNote);

  heading("FEEDBACK");
  add(analysis.aiPersonalizedFeedback || analysis.recommendation);

  heading("KEY INSIGHTS");
  getInsights(attempt).forEach((insight) => add(`- ${insight}`));

  heading("DIFFICULTY-WISE PERFORMANCE");
  (["easy", "medium", "hard", "expert"] as const).forEach((level) => {
    const b = analysis.difficultyBreakdown?.[level];
    add(`${level.toUpperCase()}: ${b?.total ? percent(b.correct, b.total) : "Not reached"}`);
  });

  heading("TOPIC-WISE PERFORMANCE");
  Object.entries(analysis.subtopicBreakdown || {}).forEach(([topic, b]) =>
    add(`${topic}: ${percent(b.correct, b.total)}`)
  );

  heading("QUESTIONS, ANSWERS & EXPLANATIONS");
  attempt.questionsSnapshot.forEach((q, idx) => {
    const userAnswer = attempt.answers[idx];
    const isCorrect = userAnswer === q.correctAnswer;
    const seconds = attempt.questionTimes?.[idx];

    add(
      `Q${idx + 1} - ${
        userAnswer === -1 ? "Not attempted" : isCorrect ? "Correct" : "Incorrect"
      } | ${q.difficulty.toUpperCase()}${
        seconds ? ` | ${seconds}s` : ""
      }`,
      { size: 9, bold: true, color: isCorrect ? green : red }
    );
    add(q.question, { bold: true, spaceAfter: 2 });
    q.options.forEach((option, i) => {
      const tags = [
        i === q.correctAnswer ? "Correct answer" : "",
        i === userAnswer ? "Your answer" : "",
      ].filter(Boolean);
      add(
        `${String.fromCharCode(65 + i)}. ${option}${tags.length ? `  [${tags.join(", ")}]` : ""}`,
        {
          size: 9,
          bold: tags.length > 0,
          color: i === q.correctAnswer ? green : i === userAnswer ? red : undefined,
        }
      );
    });
    add(`Explanation: ${q.explanation}`, { size: 9, color: [0.3, 0.35, 0.42], spaceAfter: 10 });
  });

  if (analysis.decisionLog && analysis.decisionLog.length > 0) {
    heading("ADAPTIVE ENGINE DECISION LOG");
    analysis.decisionLog.forEach((entry) =>
      add(`Q${entry.questionNumber}: ${entry.reason}`, { size: 8 })
    );
  }

  triggerDownload(
    buildMultiPagePdfBlob(lines),
    `Quiz_Report_${toAscii(attempt.topic).replace(/[^A-Za-z0-9]+/g, "_")}_${attempt.score}pct.pdf`
  );
}
