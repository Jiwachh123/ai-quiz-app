import { encryptSession } from "@/lib/adaptive-session";
import { generateAdaptiveQuestions } from "@/lib/adaptive-generator";
import { NextResponse } from "next/server";
import { v4 as uuidv4 } from "uuid";
type Difficulty = "easy" | "medium" | "hard";
export const maxDuration = 120;


export async function POST(request: Request) {
  try {
    const body = await request.json();

    const topic = String(body.topic || "").trim();
    const difficulty = body.difficulty as Difficulty;
    const totalQuestions = Number(body.count);

    if (!topic || topic.length > 200) {
      return NextResponse.json(
        { error: "Invalid topic" },
        { status: 400 }
      );
    }
    if (
  !Number.isInteger(totalQuestions) ||
  totalQuestions < 5 ||
  totalQuestions > 100
) {
  return NextResponse.json(
    { error: "Question count must be between 5 and 100" },
    { status: 400 }
  );
}

    if (!["easy", "medium", "hard"].includes(difficulty)) {
      return NextResponse.json(
        { error: "Invalid difficulty" },
        { status: 400 }
      );
    }

    const questions = await generateAdaptiveQuestions(
  topic,
  difficulty,
  Math.min(3, totalQuestions)
);

    // Only send the question and options to the browser.
    // Correct answers remain on the server for now.
    const firstQuestion = questions[0];

    const sessionToken = encryptSession({
  sessionId: uuidv4(),
  topic,
  difficulty,
  totalQuestions ,
  questions,
  currentIndex: 0,
  correctCount: 0,
  consecutiveCorrect: 0,
  consecutiveWrong: 0,
  createdAt: Date.now(),
});

return NextResponse.json({
  sessionToken,
  question: {
    id: firstQuestion.id,
    question: firstQuestion.question,
    options: firstQuestion.options,
    difficulty: firstQuestion.difficulty,
  },
});
  } catch (error) {
    console.error("Adaptive quiz start error:", error);

    return NextResponse.json(
      { error: "Could not start adaptive quiz" },
      { status: 503 }
    );
  }
}
