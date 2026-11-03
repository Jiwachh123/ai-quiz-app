import { Question } from "@/types";
import { generateAdaptiveQuestions } from "@/lib/adaptive-generator";

export async function generateQuizQuestions(
  topic: string,
  count: number = 5,
  difficulty: "easy" | "medium" | "hard" = "medium"
): Promise<Question[]> {
  return await generateAdaptiveQuestions(topic, difficulty, count);
}
