import { QuizAttempt, User, UserStats } from "@/types";

function escapePdfText(str: string): string {
  return String(str || "")
    .replace(/[^\x20-\x7E]/g, " ") // Keep clean ASCII for standard PDF Helvetica font
    .replace(/\\/g, "\\\\")
    .replace(/\(/g, "\\(")
    .replace(/\)/g, "\\)");
}

function wrapText(text: string, maxChars: number): string[] {
  const words = String(text || "").split(/\s+/);
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
      : "Great consistency! Challenge yourself with GATE / BEU Hard-to-Expert adaptive sessions to push mastery higher.";
  wrapText(recText, 88).forEach((l) => lines.push({ text: l, size: 10 }));

  const blob = buildMultiPagePdfBlob(lines);
  triggerDownload(
    blob,
    `Adaptive_Quiz_Performance_Report_${user.name.replace(/\s+/g, "_")}.pdf`
  );
}

export function downloadSingleQuizReportPdf(attempt: QuizAttempt, studentName: string) {
  const lines: PdfLine[] = [];

  lines.push({
    text: "ADAPTIVE QUIZ APPLICATION - QUIZ ANALYSIS REPORT",
    size: 16,
    bold: true,
    color: [0.31, 0.27, 0.9],
    spaceAfter: 4,
  });
  lines.push({
    text: `Quiz: ${attempt.quizTitle} | Student: ${studentName}`,
    size: 11,
    bold: true,
    spaceAfter: 2,
  });
  lines.push({
    text: `Topic: ${attempt.topic} | Completed: ${new Date(attempt.completedAt).toLocaleString()}`,
    size: 9,
    color: [0.4, 0.45, 0.52],
    spaceAfter: 10,
  });

  lines.push({ text: "1. SCORE & TIME MANAGEMENT", size: 12, bold: true, color: [0.2, 0.25, 0.6], spaceAfter: 4 });
  lines.push({
    text: `Marks: ${attempt.correctCount} / ${attempt.totalQuestions} | Accuracy: ${attempt.score}% | Total Time: ${attempt.timeTaken}s`,
    size: 10,
  });
  lines.push({
    text: `Average Time per Question: ${attempt.analysis.averageTimePerQuestion}s | Fastest: ${attempt.analysis.fastestTimeSec}s | Slowest: ${attempt.analysis.slowestTimeSec}s`,
    size: 10,
  });
  wrapText(`Time Management: ${attempt.analysis.timeManagementNote}`, 88).forEach((l) =>
    lines.push({ text: l, size: 9 })
  );
  lines.push({ text: "", size: 6 });

  lines.push({ text: "2. AI PERSONALIZED FEEDBACK & RECOMMENDATIONS", size: 12, bold: true, color: [0.2, 0.25, 0.6], spaceAfter: 4 });
  wrapText(
    attempt.analysis.aiPersonalizedFeedback || attempt.analysis.recommendation,
    88
  ).forEach((l) => lines.push({ text: l, size: 10 }));
  lines.push({ text: "", size: 6 });

  lines.push({ text: "3. DIFFICULTY & TOPIC BREAKDOWN", size: 12, bold: true, color: [0.2, 0.25, 0.6], spaceAfter: 4 });
  (["easy", "medium", "hard", "expert"] as const).forEach((d) => {
    const b = attempt.analysis.difficultyBreakdown?.[d] || { total: 0, correct: 0 };
    if (b.total > 0) {
      lines.push({
        text: `  - ${d.toUpperCase()}: ${b.correct}/${b.total} (${Math.round((b.correct / b.total) * 100)}%)`,
        size: 10,
      });
    }
  });
  Object.entries(attempt.analysis.subtopicBreakdown || {}).forEach(([sub, b]) => {
    lines.push({
      text: `  - Subtopic [${sub}]: ${b.correct}/${b.total} (${Math.round((b.correct / b.total) * 100)}%)`,
      size: 9,
    });
  });
  lines.push({ text: "", size: 6 });

  if (attempt.analysis.decisionLog && attempt.analysis.decisionLog.length > 0) {
    lines.push({ text: "4. ADAPTIVE ENGINE DECISION LOG", size: 12, bold: true, color: [0.2, 0.25, 0.6], spaceAfter: 4 });
    attempt.analysis.decisionLog.forEach((entry) => {
      wrapText(`Q${entry.questionNumber}: ${entry.reason}`, 90).forEach((l) =>
        lines.push({ text: l, size: 8 })
      );
    });
  }

  const blob = buildMultiPagePdfBlob(lines);
  triggerDownload(
    blob,
    `Quiz_Report_${attempt.topic.replace(/\s+/g, "_")}_${attempt.score}pct.pdf`
  );
}
