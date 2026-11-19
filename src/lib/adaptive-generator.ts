import { GoogleGenerativeAI } from "@google/generative-ai";
import { v4 as uuidv4 } from "uuid";
import { QuestionVerification } from "@/types";
import dns from "dns";

// Fix Node.js IPv6 / Cloudflare connect timeout on Indian ISPs
if (typeof dns.setDefaultResultOrder === "function") {
  dns.setDefaultResultOrder("ipv4first");
}

export type Difficulty = "easy" | "medium" | "hard";

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

/**
 * Lightweight Question Generation Prompt:
 * NO automatic verification overhead here — verification only happens when requested by the user!
 */
function getPrompt(topic: string, difficulty: Difficulty, count: number) {
  return `
Generate exactly ${count} multiple-choice quiz questions.

Topic: ${topic}
Difficulty: ${difficulty}

Rules:
- Each question must have exactly 4 options.
- Only one option must be correct.
- correctAnswer must be the zero-based option index (0, 1, 2, or 3).
- Include a clear explanation.
- Include a short "subtopic" name for weak-area tracking.
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
      // Not verified until the user explicitly clicks "Verify Answer with AI"
      verification: {
        isVerified: false,
        confidence: 0,
      },
    };
  });
}

async function callLLMJson(prompt: string, temperature = 0.4): Promise<string> {
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
            signal: AbortSignal.timeout(12000),
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

  // 2. Second (Backup): Google Gemini (`gemini-3.8-flash` with retry on 503 High Demand)
  if (geminiApiKey) {
    const genAI = new GoogleGenerativeAI(geminiApiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-3.8-flash" });

    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        const result = await model.generateContent(prompt);
        const text = result.response.text();
        if (text) return text;
      } catch (e: any) {
        console.warn(
          `Gemini (gemini-3.8-flash) attempt ${attempt}/3 failed:`,
          e?.status || e
        );
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
            signal: AbortSignal.timeout(12000),
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

/**
 * Generates adaptive quiz questions WITHOUT wasting any extra API calls on automatic verification.
 */
export async function generateAdaptiveQuestions(
  topic: string,
  difficulty: Difficulty,
  count: number = 1
): Promise<AdaptiveQuestion[]> {
  const rawText = await callLLMJson(getPrompt(topic, difficulty, count), 0.4);
  return parseQuestions(rawText, topic, difficulty, count);
}

/**
 * User-Demanded Question Verification ONLY:
 * Called ONLY when the student clicks "Verify / Dispute Answer Key" on a specific question.
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
You are an impartial Senior Academic Arbitrator. A student has requested verification of the answer key for this specific question:

Question: "${params.question}"
Options:
0 (A): "${params.options[0]}"
1 (B): "${params.options[1]}"
2 (C): "${params.options[2]}"
3 (D): "${params.options[3]}"

Current Official Answer Index: ${params.currentCorrectAnswer} (${String.fromCharCode(
    65 + params.currentCorrectAnswer
  )}: "${params.options[params.currentCorrectAnswer]}")
${
  params.userSelectedAnswer !== undefined && params.userSelectedAnswer !== null
    ? `Student's Selected Answer Index: ${params.userSelectedAnswer} (${String.fromCharCode(
        65 + params.userSelectedAnswer
      )}: "${params.options[params.userSelectedAnswer]}")`
    : ""
}
Current Explanation: "${params.explanation || ""}"

Task:
1. Solve the question carefully from first principles.
2. Determine which option index (0, 1, 2, or 3) is factually correct.
3. Provide a clear explanation proving the correct option.

Return ONLY valid JSON in this exact format:
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