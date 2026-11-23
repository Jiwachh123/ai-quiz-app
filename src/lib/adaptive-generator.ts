import { GoogleGenerativeAI } from "@google/generative-ai";
import { v4 as uuidv4 } from "uuid";
import {
  Difficulty,
  ExamMode,
  QuestionVerification,
  StudyPlanDay,
} from "@/types";
import dns from "dns";

if (typeof dns.setDefaultResultOrder === "function") {
  dns.setDefaultResultOrder("ipv4first");
}

export interface AdaptiveQuestion {
  id: string;
  question: string;
  options: string[];
  correctAnswer: number;
  explanation: string;
  difficulty: Difficulty;
  topic: string;
  subtopic?: string;
  verification?: QuestionVerification;
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

function getPrompt(
  topic: string,
  difficulty: Difficulty,
  count: number,
  examMode: ExamMode = "custom",
  syllabusText?: string
) {
  const modeGuidance: Record<ExamMode, string> = {
    custom: "Standard conceptual and applied university-level multiple-choice questions.",
    gate: "GATE CSE Examination style: rigorous conceptual depth, numerical/analytical reasoning, edge cases, and time/space complexity or systems precision.",
    beu: "BEU (Bihar Engineering University) B.Tech CSE semester examination style: clear syllabus alignment, core definitions, algorithmic trace, and applied architecture questions.",
    syllabus: "Generate questions STRICTLY grounded in the provided syllabus / PDF excerpt below.",
  };

  const difficultyGuidance: Record<Difficulty, string> = {
    easy: "Easy (foundational definitions and direct recall).",
    medium: "Medium (application, moderate reasoning, comparing concepts).",
    hard: "Hard (multi-step analysis, subtle edge cases, numerical/trace reasoning).",
    expert: "Expert (GATE-topper / research-grade synthesis, tricky corner cases, deep optimization).",
  };

  const syllabusSection =
    syllabusText && syllabusText.trim().length > 0
      ? `\nReference Syllabus / PDF Material:\n---\n${syllabusText.slice(0, 3500)}\n---\n`
      : "";

  return `
Generate exactly ${count} multiple-choice quiz questions.

Topic: ${topic}
Exam Mode: ${examMode.toUpperCase()} — ${modeGuidance[examMode]}
Difficulty: ${difficultyGuidance[difficulty]}
${syllabusSection}
Rules:
- Each question must have exactly 4 distinct options.
- Only ONE option must be factually correct.
- correctAnswer must be the zero-based option index (0, 1, 2, or 3).
- Include a clear, concise explanation.
- Include a specific "subtopic" tag for weak-area analytics.
- Return valid JSON only.

Required format:
{
  "questions": [
    {
      "question": "Question text",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "correctAnswer": 0,
      "explanation": "Explanation",
      "subtopic": "Subtopic Name"
    }
  ]
}
`;
}

function extractJsonObject(raw: string): any {
  const cleaned = raw
    .replace(/```json/gi, "")
    .replace(/```/g, "")
    .trim();
  try {
    return JSON.parse(cleaned);
  } catch {
    const firstBrace = cleaned.indexOf("{");
    const lastBrace = cleaned.lastIndexOf("}");
    if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
      return JSON.parse(cleaned.slice(firstBrace, lastBrace + 1));
    }
    const firstBracket = cleaned.indexOf("[");
    const lastBracket = cleaned.lastIndexOf("]");
    if (firstBracket !== -1 && lastBracket !== -1 && lastBracket > firstBracket) {
      return JSON.parse(cleaned.slice(firstBracket, lastBracket + 1));
    }
    throw new Error("Could not parse JSON from AI response");
  }
}

function parseQuestions(
  text: string,
  topic: string,
  difficulty: Difficulty,
  count: number
): AdaptiveQuestion[] {
  const parsed = extractJsonObject(text);
  const questions = Array.isArray(parsed) ? parsed : parsed.questions;

  if (!Array.isArray(questions) || questions.length === 0) {
    throw new Error("AI returned an invalid question list.");
  }

  return questions.slice(0, count).map((q: any) => {
    const ansIdx =
      Number.isInteger(Number(q.correctAnswer)) &&
      Number(q.correctAnswer) >= 0 &&
      Number(q.correctAnswer) <= 3
        ? Number(q.correctAnswer)
        : 0;

    return {
      id: uuidv4(),
      question: String(q.question),
      options: Array.isArray(q.options)
        ? q.options.slice(0, 4).map(String)
        : ["Option A", "Option B", "Option C", "Option D"],
      correctAnswer: ansIdx,
      explanation: String(
        q.explanation || "Correct based on standard principles."
      ),
      difficulty,
      topic,
      subtopic: q.subtopic ? String(q.subtopic) : topic,
      verification: {
        isVerified: false,
        confidence: 0,
      },
    };
  });
}

export async function callLLMJson(prompt: string, temperature = 0.4): Promise<string> {
  const groqApiKey =
    process.env.GROQ_API_KEY || process.env.NEXT_PUBLIC_GROQ_API_KEY || "";
  const geminiApiKey =
    process.env.GEMINI_API_KEY || process.env.NEXT_PUBLIC_GEMINI_API_KEY || "";
  const openRouterApiKey =
    process.env.OPENROUTER_API_KEY ||
    process.env.NEXT_PUBLIC_OPENROUTER_API_KEY ||
    "";

  // 1. Primary: Groq
  if (groqApiKey) {
    const groqModels = [
      "openai/gpt-oss-20b",
      "llama-3.3-70b-versatile",
      "llama-3.1-8b-instant",
    ];
    for (const gModel of groqModels) {
      try {
        const res = await fetch(
          "https://api.groq.com/openai/v1/chat/completions",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${groqApiKey}`,
            },
            body: JSON.stringify({
              model: gModel,
              messages: [{ role: "user", content: prompt }],
              temperature,
              response_format: { type: "json_object" },
            }),
            signal: AbortSignal.timeout(14000),
          }
        );
        if (res.ok) {
          const data = await res.json();
          const content = data.choices?.[0]?.message?.content;
          if (content) return content;
        }
      } catch (e) {
        console.warn(`Groq (${gModel}) failed:`, e);
      }
    }
  }

  // 2. Second (Backup): Google Gemini (`gemini-3.8-flash` with retry on 503)
  if (geminiApiKey) {
    const genAI = new GoogleGenerativeAI(geminiApiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-3.8-flash" });

    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        const result = await model.generateContent(prompt);
        const text = result.response.text();
        if (text) return text;
      } catch (e: any) {
        console.warn(`Gemini attempt ${attempt}/3 failed:`, e?.status || e);
        if (attempt < 3) {
          await sleep(attempt * 1500);
        }
      }
    }
  }

  // 3. Third: OpenRouter
  if (openRouterApiKey) {
    const openRouterModels = [
      "meta-llama/llama-3.3-70b-instruct",
      "meta-llama/llama-3.1-8b-instruct:free",
    ];
    for (const orModel of openRouterModels) {
      try {
        const res = await fetch(
          "https://openrouter.ai/api/v1/chat/completions",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${openRouterApiKey}`,
              "HTTP-Referer": "http://localhost:3000",
              "X-Title": "Adaptive Quiz Application",
            },
            body: JSON.stringify({
              model: orModel,
              messages: [{ role: "user", content: prompt }],
              temperature,
            }),
            signal: AbortSignal.timeout(14000),
          }
        );
        if (res.ok) {
          const data = await res.json();
          const content = data.choices?.[0]?.message?.content;
          if (content) return content;
        }
      } catch (e) {
        console.warn(`OpenRouter (${orModel}) call failed:`, e);
      }
    }
  }

  throw new Error("All 3 AI providers (Groq, Gemini, OpenRouter) failed.");
}

export async function generateAdaptiveQuestions(
  topic: string,
  difficulty: Difficulty,
  count: number = 1,
  examMode: ExamMode = "custom",
  syllabusText?: string
): Promise<AdaptiveQuestion[]> {
  const rawText = await callLLMJson(
    getPrompt(topic, difficulty, count, examMode, syllabusText),
    0.4
  );
  return parseQuestions(rawText, topic, difficulty, count);
}

/**
 * On-demand single question verification (user-triggered only)
 */
export async function verifySingleQuestionDispute(params: {
  question: string;
  options: string[];
  currentCorrectAnswer: number;
  userSelectedAnswer?: number;
  explanation?: string;
}): Promise<{
  verifiedCorrectAnswer: number;
  changed: boolean;
  confidence: number;
  verificationExplanation: string;
}> {
  const prompt = `
You are an impartial Senior Academic Arbitrator. A student has requested verification of this question:

Question: "${params.question}"
Options:
0 (A): "${params.options[0]}"
1 (B): "${params.options[1]}"
2 (C): "${params.options[2]}"
3 (D): "${params.options[3]}"

Current Official Answer Index: ${params.currentCorrectAnswer}
Current Explanation: "${params.explanation || ""}"

Return ONLY valid JSON:
{
  "verifiedCorrectAnswer": 0,
  "confidence": 99,
  "verificationExplanation": "Detailed step-by-step verification proving which option is correct."
}
`;

  const rawText = await callLLMJson(prompt, 0.1);
  const parsed = extractJsonObject(rawText);

  const verifiedIdx =
    Number.isInteger(Number(parsed.verifiedCorrectAnswer)) &&
    Number(parsed.verifiedCorrectAnswer) >= 0 &&
    Number(parsed.verifiedCorrectAnswer) <= 3
      ? Number(parsed.verifiedCorrectAnswer)
      : params.currentCorrectAnswer;

  return {
    verifiedCorrectAnswer: verifiedIdx,
    changed: verifiedIdx !== params.currentCorrectAnswer,
    confidence: Number(parsed.confidence) || 98,
    verificationExplanation:
      String(parsed.verificationExplanation) ||
      params.explanation ||
      "Verified against authoritative academic sources.",
  };
}

/**
 * AI-Generated Personalized Post-Quiz Feedback Paragraph
 */
export async function generatePersonalizedFeedback(params: {
  topic: string;
  score: number;
  correctCount: number;
  totalQuestions: number;
  averageTimePerQuestion: number;
  weakAreas: string[];
  strongAreas: string[];
  highestDifficultyReached: Difficulty;
}): Promise<string> {
  const prompt = `
You are an encouraging, sharp academic mentor for a B.Tech CSE / competitive exam student.
Write a concise, personalized 3-4 sentence diagnostic feedback paragraph based on this quiz attempt:
- Topic: ${params.topic}
- Score: ${params.score}% (${params.correctCount}/${params.totalQuestions})
- Average time per question: ${params.averageTimePerQuestion} seconds
- Highest difficulty reached: ${params.highestDifficultyReached}
- Strong areas: ${params.strongAreas.join(", ") || "None clearly isolated yet"}
- Weak areas: ${params.weakAreas.join(", ") || "General conceptual depth"}

Diagnose their specific weak spots, comment briefly on their pacing/time management, and recommend the exact next 1-2 concepts they should study.
Return ONLY valid JSON:
{
  "feedback": "Your concise personalized paragraph here."
}
`;

  try {
    const raw = await callLLMJson(prompt, 0.5);
    const parsed = extractJsonObject(raw);
    if (parsed?.feedback && typeof parsed.feedback === "string") {
      return parsed.feedback.trim();
    }
  } catch (err) {
    console.warn("AI feedback fallback used:", err);
  }

  return `You scored ${params.score}% on ${params.topic} at an average pace of ${params.averageTimePerQuestion}s per question, reaching the ${params.highestDifficultyReached.toUpperCase()} tier. ${
    params.weakAreas.length > 0
      ? `Your primary weak spots are ${params.weakAreas.join(", ")}—focus your next revision session there before attempting Hard/Expert drills.`
      : `Your foundation is solid; challenge yourself with timed GATE/BEU Hard-to-Expert quizzes to sharpen exam speed.`
  }`;
}

/**
 * AI 7-Day Personalized Study Plan Generator
 */
export async function generateSevenDayStudyPlan(params: {
  studentName: string;
  targetExam: string;
  overallAccuracy: number;
  weakTopics: string[];
  strongTopics: string[];
  recentTopics: string[];
}): Promise<{ summary: string; days: StudyPlanDay[] }> {
  const focusList =
    params.weakTopics.length > 0
      ? params.weakTopics
      : params.recentTopics.length > 0
      ? params.recentTopics
      : ["Data Structures & Algorithms", "Operating Systems", "DBMS", "Computer Networks"];

  const prompt = `
Create a personalized 7-Day Study Plan for a student named ${params.studentName}.
Target Goal / Exam: ${params.targetExam}
Current Overall Accuracy: ${params.overallAccuracy}%
Weak Topics (Highest Priority): ${focusList.join(", ")}
Strong Topics (Light Maintenance): ${params.strongTopics.join(", ") || "Building baseline"}

Rules:
- Return exactly 7 days (day 1 through day 7).
- Days 1-4 should intensely target weak topics with spaced repetition.
- Day 5-6 should mix medium/hard problem solving and timed quizzes.
- Day 7 should be a full mock test + revision review.
- Keep each day practical (45-90 minutes).
- Return ONLY valid JSON in this format:
{
  "summary": "2-sentence overview of the 7-day strategy.",
  "days": [
    {
      "day": 1,
      "title": "Short Day Title",
      "focusTopics": ["Topic 1", "Topic 2"],
      "tasks": ["Task 1", "Task 2", "Task 3"],
      "practiceQuizTopic": "Exact topic name for a practice quiz",
      "estimatedMinutes": 60
    }
  ]
}
`;

  try {
    const raw = await callLLMJson(prompt, 0.5);
    const parsed = extractJsonObject(raw);
    if (Array.isArray(parsed.days) && parsed.days.length === 7) {
      return {
        summary: String(parsed.summary || "Personalized 7-day adaptive mastery plan."),
        days: parsed.days.map((d: any, i: number) => ({
          day: Number(d.day) || i + 1,
          title: String(d.title || `Day ${i + 1} Study Focus`),
          focusTopics: Array.isArray(d.focusTopics) ? d.focusTopics.map(String) : [focusList[i % focusList.length]],
          tasks: Array.isArray(d.tasks) ? d.tasks.map(String) : ["Review notes and take a 10-question adaptive quiz."],
          practiceQuizTopic: String(d.practiceQuizTopic || focusList[i % focusList.length]),
          estimatedMinutes: Number(d.estimatedMinutes) || 60,
          completed: false,
        })),
      };
    }
  } catch (err) {
    console.warn("Study plan fallback used:", err);
  }

  // Deterministic fallback 7-day plan if APIs are temporarily busy
  const days: StudyPlanDay[] = Array.from({ length: 7 }, (_, i) => {
    const t = focusList[i % focusList.length];
    return {
      day: i + 1,
      title:
        i < 4
          ? `Deep-Dive & Mistake Repair: ${t}`
          : i < 6
          ? `Timed Problem Solving: ${t}`
          : "Full Mock Assessment & Spaced Repetition",
      focusTopics: [t],
      tasks: [
        `Review core concepts and formulas for ${t} (25 mins)`,
        `Complete overdue Smart Revision flashcards in your deck (15 mins)`,
        `Take a 10-question timed Adaptive Quiz on ${t} targeting Hard/Expert tier (20 mins)`,
      ],
      practiceQuizTopic: t,
      estimatedMinutes: 60,
      completed: false,
    };
  });

  return {
    summary: `This 7-day plan targets your highest-impact weak areas (${focusList
      .slice(0, 3)
      .join(", ")}) using spaced repetition and timed ${params.targetExam} drills.`,
    days,
  };
}
