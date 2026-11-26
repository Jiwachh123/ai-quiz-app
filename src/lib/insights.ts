import { QuizAttempt } from "@/types";

/** Plain-language observations, shown both on screen and in the PDF report. */
export function getInsights(attempt: QuizAttempt): string[] {
  const questions = attempt.questionsSnapshot;
  const isRight = (i: number) => attempt.answers[i] === questions[i].correctAnswer;
  const numbers = (test: (i: number) => boolean) =>
    questions
      .map((_, i) => i)
      .filter(test)
      .map((i) => `Q${i + 1}`)
      .join(", ");

  const insights: string[] = [];

  const wrong = numbers((i) => !isRight(i));
  insights.push(
    wrong ? `Review these wrong answers: ${wrong}.` : "You answered every question correctly."
  );

  const overconfident = numbers((i) => !isRight(i) && attempt.confidences?.[i] === "high");
  if (overconfident) {
    insights.push(
      `You were highly confident but wrong in ${overconfident}. Check these concepts first.`
    );
  }

  const unsure = numbers((i) => isRight(i) && attempt.confidences?.[i] === "low");
  if (unsure) {
    insights.push(`You were right but unsure in ${unsure}. Revise them to build confidence.`);
  }

  const { weakAreas, strongAreas } = attempt.analysis;
  if (weakAreas.length > 0) insights.push(`Needs practice: ${weakAreas.join(", ")}.`);
  if (strongAreas.length > 0) insights.push(`Strong in: ${strongAreas.join(", ")}.`);

  return insights;
}
