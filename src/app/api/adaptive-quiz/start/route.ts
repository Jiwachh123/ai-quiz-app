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
    const difficulty = (body.difficulty || "medium") as Difficulty;
    const totalQuestions = Number(body.count) || 10;

    if (!topic || topic.length > 200) {
      return NextResponse.json({ error: "Invalid topic" }, { status: 400 });
    }
    if (
      !Number.isInteger(totalQuestions) ||
      totalQuestions < 3 ||
      totalQuestions > 100
    ) {
      return NextResponse.json(
        { error: "Question count must be between 3 and 100" },
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

    const firstQuestion = questions[0];

    const sessionToken = encryptSession({
      sessionId: uuidv4(),
      topic,
      difficulty,
      totalQuestions,
      questions,
      answers: [],
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
        subtopic: firstQuestion.subtopic || topic,
        verification: firstQuestion.verification,
      },
    });
  } catch (error) {
    console.error("Adaptive quiz start error:", error);

    return NextResponse.json(
      { error: "Could not start adaptive quiz. Check your API keys." },
      { status: 503 }
    );
  }
}
