import { NextResponse } from "next/server";
import { generatePersonalizedFeedback } from "@/lib/adaptive-generator";
import { Difficulty } from "@/types";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const feedback = await generatePersonalizedFeedback({
      topic: String(body.topic || "General"),
      score: Number(body.score) || 0,
      correctCount: Number(body.correctCount) || 0,
      totalQuestions: Number(body.totalQuestions) || 0,
      averageTimePerQuestion: Number(body.averageTimePerQuestion) || 0,
      weakAreas: Array.isArray(body.weakAreas) ? body.weakAreas : [],
      strongAreas: Array.isArray(body.strongAreas) ? body.strongAreas : [],
      highestDifficultyReached: (body.highestDifficultyReached || "medium") as Difficulty,
    });

    return NextResponse.json({ feedback });
  } catch (error) {
    console.error("Quiz feedback error:", error);
    return NextResponse.json(
      { error: "Could not generate feedback" },
      { status: 500 }
    );
  }
}
