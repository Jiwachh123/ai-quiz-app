import { NextResponse } from "next/server";
import { verifySingleQuestionDispute } from "@/lib/adaptive-generator";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      question,
      options,
      currentCorrectAnswer,
      userSelectedAnswer,
      explanation,
    } = body;

    if (
      typeof question !== "string" ||
      !Array.isArray(options) ||
      options.length !== 4 ||
      !Number.isInteger(currentCorrectAnswer)
    ) {
      return NextResponse.json(
        { error: "Invalid question payload for verification" },
        { status: 400 }
      );
    }

    const result = await verifySingleQuestionDispute({
      question,
      options,
      currentCorrectAnswer,
      userSelectedAnswer,
      explanation,
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error("Verify question error:", error);
    return NextResponse.json(
      { error: "Could not complete AI verification at this moment." },
      { status: 500 }
    );
  }
}
