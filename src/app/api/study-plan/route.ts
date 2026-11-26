import { NextResponse } from "next/server";
import { generateSevenDayStudyPlan } from "@/lib/adaptive-generator";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const plan = await generateSevenDayStudyPlan({
      studentName: String(body.studentName || "Student"),
      targetExam: String(body.targetExam || "University Semester Exams"),
      overallAccuracy: Number(body.overallAccuracy) || 0,
      weakTopics: Array.isArray(body.weakTopics) ? body.weakTopics : [],
      strongTopics: Array.isArray(body.strongTopics) ? body.strongTopics : [],
      recentTopics: Array.isArray(body.recentTopics) ? body.recentTopics : [],
    });

    return NextResponse.json(plan);
  } catch (error) {
    console.error("Study plan error:", error);
    return NextResponse.json(
      { error: "Could not generate 7-day study plan" },
      { status: 500 }
    );
  }
}
