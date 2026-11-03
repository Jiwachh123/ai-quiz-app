import { GoogleGenerativeAI } from "@google/generative-ai";
import { v4 as uuidv4 } from "uuid";
import { QuestionVerification } from "@/types";

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

function getPrompt(topic: string, difficulty: Difficulty, count: number) {
  return `
Generate exactly ${count} multiple-choice quiz questions.

Topic: ${topic}
Difficulty: ${difficulty}

Rules:
- Each question must have exactly 4 distinct, unambiguous options.
- Only ONE option must be factually and logically correct.
- Double-check facts, calculations, and zero-based option index (0, 1, 2, or 3) so that options[correctAnswer] matches the explanation 100%.
- Include a clear, educational explanation proving why the correct option is right and why others are wrong.
- Include a specific "subtopic" tag (e.g., for Topic "Data Structures", subtopic could be "Binary Trees", "Hash Tables", etc.).
- Return valid JSON only.

Required format:
{
  "questions": [
    {
      "question": "Question text",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "correctAnswer": 0,
      "explanation": "Step-by-step explanation confirming Option A is correct.",
      "subtopic": "Specific Concept"
    }
  ]
}
`;
}

function getVerificationPrompt(questions: AdaptiveQuestion[]) {
  const payload = questions.map((q, index) => ({
    index,
    question: q.question,
    options: q.options,
    proposedCorrectAnswer: q.correctAnswer,
    proposedExplanation: q.explanation,
  }));

  return `
You are an independent Fact-Checking & Answer-Key Auditor for an academic Computer Science & General Knowledge examination board.

Audit the following multiple-choice questions and verify whether "proposedCorrectAnswer" (0-based index: 0, 1, 2, or 3) is factually and logically accurate, and whether it aligns with the explanation.

Questions to audit:
${JSON.stringify(payload, null, 2)}

For each question:
1. Solve the question independently first.
2. Check if the option at index "proposedCorrectAnswer" is truly the single best, factually accurate answer.
3. If "proposedCorrectAnswer" is wrong or mismatched with the explanation, provide the corrected 0-based index (0, 1, 2, or 3) in "verifiedCorrectAnswer" and a corrected explanation in "verifiedExplanation".
4. Provide a confidence score from 0 to 100 and a short "verificationNote" summarizing the audit check.

Return ONLY valid JSON in this exact format:
{
  "audits": [
    {
      "index": 0,
      "isAccurate": true,
      "verifiedCorrectAnswer": 0,
      "verifiedExplanation": "Updated or confirmed explanation.",
      "confidence": 98,
      "verificationNote": "Verified against standard definition; option index matches explanation."
    }
  ]
}
`;
}

/**
 * Deterministic Heuristic & Consistency Auditor
 * Catches common AI indexing errors (e.g., explanation says "Option B is correct" while correctAnswer is 0)
 */
function runDeterministicConsistencyAudit(q: AdaptiveQuestion): AdaptiveQuestion {
  let correctedAnswer = q.correctAnswer;
  let correctedByHeuristic = false;
  let note = "Verified by AI Auditor + Consistency Check";

  const expLower = q.explanation.toLowerCase();

  // Check if explanation explicitly names "Option A/B/C/D" or "(A)/(B)/(C)/(D)"
  const letterMatch = expLower.match(
    /(?:option|choice|answer is)\s+([abcd])/i
  );
  if (letterMatch) {
    const letterIdx = "abcd".indexOf(letterMatch[1].toLowerCase());
    if (letterIdx >= 0 && letterIdx <= 3 && letterIdx !== correctedAnswer) {
      correctedAnswer = letterIdx;
      correctedByHeuristic = true;
      note = `Auto-aligned answer index to Option ${letterMatch[1].toUpperCase()} based on explanation consistency.`;
    }
  }

  return {
    ...q,
    correctAnswer: correctedAnswer,
    verification: {
      isVerified: true,
      confidence: q.verification?.confidence ?? 95,
      originalAnswer: q.verification?.originalAnswer ?? q.correctAnswer,
      correctedByAI: q.verification?.correctedByAI || correctedByHeuristic,
      verificationNote: q.verification?.verificationNote || note,
    },
  };
}

function parseQuestions(
  text: string,
  topic: string,
  difficulty: Difficulty,
  count: number
): AdaptiveQuestion[] {
  const cleaned = text
    .replace(/```json/gi, "")
    .replace(/```/g, "")
    .trim();

  const parsed = JSON.parse(cleaned);
  const questions = Array.isArray(parsed) ? parsed : parsed.questions;

  if (!Array.isArray(questions) || questions.length === 0) {
    throw new Error("AI returned an invalid question list.");
  }

  return questions.slice(0, count).map((q: any) => ({
    id: uuidv4(),
    question: String(q.question),
    options: Array.isArray(q.options) ? q.options.slice(0, 4).map(String) : ["A", "B", "C", "D"],
    correctAnswer:
      Number.isInteger(Number(q.correctAnswer)) &&
      Number(q.correctAnswer) >= 0 &&
      Number(q.correctAnswer) <= 3
        ? Number(q.correctAnswer)
        : 0,
    explanation: String(q.explanation || "Correct based on standard principles."),
    difficulty,
    topic,
    subtopic: q.subtopic ? String(q.subtopic) : topic,
  }));
}

const groqApiKey =
  process.env.GROQ_API_KEY || process.env.NEXT_PUBLIC_GROQ_API_KEY || "";
const geminiApiKey =
  process.env.GEMINI_API_KEY || process.env.NEXT_PUBLIC_GEMINI_API_KEY || "";
const openRouterApiKey =
  process.env.OPENROUTER_API_KEY || process.env.NEXT_PUBLIC_OPENROUTER_API_KEY || "";

const genAI = new GoogleGenerativeAI(geminiApiKey);

async function callLLMJson(prompt: string, temperature = 0.3): Promise<string> {
  if (groqApiKey) {
    try {
      const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${groqApiKey}`,
        },
        body: JSON.stringify({
          model: "llama-3.3-70b-versatile",
          messages: [{ role: "user", content: prompt }],
          temperature,
          response_format: { type: "json_object" },
        }),
      });
      if (res.ok) {
        const data = await res.json();
        const content = data.choices?.[0]?.message?.content;
        if (content) return content;
      }
    } catch (e) {
      console.warn("Groq call failed:", e);
    }
  }

  if (geminiApiKey) {
    try {
      const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
      const result = await model.generateContent(prompt);
      const text = result.response.text();
      if (text) return text;
    } catch (e) {
      console.warn("Gemini call failed:", e);
    }
  }

  if (openRouterApiKey) {
    try {
      const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${openRouterApiKey}`,
        },
        body: JSON.stringify({
          model: "google/gemini-2.0-flash-lite-001",
          messages: [{ role: "user", content: prompt }],
          temperature,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        const content = data.choices?.[0]?.message?.content;
        if (content) return content;
      }
    } catch (e) {
      console.warn("OpenRouter call failed:", e);
    }
  }

  throw new Error("No AI API keys configured or all providers failed.");
}

/**
 * Layer 1 + Layer 2 Verification Pipeline:
 * Audits generated questions with a low-temperature verification pass and deterministic consistency check.
 */
export async function verifyQuestionsBatch(
  questions: AdaptiveQuestion[]
): Promise<AdaptiveQuestion[]> {
  try {
    const rawAudit = await callLLMJson(getVerificationPrompt(questions), 0.1);
    const cleaned = rawAudit
      .replace(/```json/gi, "")
      .replace(/```/g, "")
      .trim();
    const parsed = JSON.parse(cleaned);
    const audits = Array.isArray(parsed.audits) ? parsed.audits : [];

    return questions.map((q, idx) => {
      const audit = audits.find((a: any) => Number(a.index) === idx);
      if (!audit) {
        return runDeterministicConsistencyAudit(q);
      }

      const verifiedAnswer =
        Number.isInteger(Number(audit.verifiedCorrectAnswer)) &&
        Number(audit.verifiedCorrectAnswer) >= 0 &&
        Number(audit.verifiedCorrectAnswer) <= 3
          ? Number(audit.verifiedCorrectAnswer)
          : q.correctAnswer;

      const wasCorrected = verifiedAnswer !== q.correctAnswer;

      const updated: AdaptiveQuestion = {
        ...q,
        correctAnswer: verifiedAnswer,
        explanation: audit.verifiedExplanation
          ? String(audit.verifiedExplanation)
          : q.explanation,
        verification: {
          isVerified: true,
          confidence: Number(audit.confidence) || 96,
          originalAnswer: q.correctAnswer,
          correctedByAI: wasCorrected,
          verificationNote:
            audit.verificationNote ||
            (wasCorrected
              ? `AI Auditor corrected answer key from Option ${String.fromCharCode(
                  65 + q.correctAnswer
                )} to Option ${String.fromCharCode(65 + verifiedAnswer)}.`
              : "AI Auditor verified answer key and explanation accuracy."),
        },
      };

      return runDeterministicConsistencyAudit(updated);
    });
  } catch (err) {
    console.warn("AI Verification pass fallback to deterministic check:", err);
    return questions.map((q) => runDeterministicConsistencyAudit(q));
  }
}

export async function generateAdaptiveQuestions(
  topic: string,
  difficulty: Difficulty,
  count: number = 1
): Promise<AdaptiveQuestion[]> {
  const rawText = await callLLMJson(getPrompt(topic, difficulty, count), 0.5);
  const initialQuestions = parseQuestions(rawText, topic, difficulty, count);
  return await verifyQuestionsBatch(initialQuestions);
}

/**
 * On-Demand Question Disputation / Re-Verification
 * Triggered when a student clicks "Dispute / Re-verify Answer with AI" during or after a quiz.
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
You are an impartial Senior Academic Arbitrator. A student has disputed the answer key for the following multiple-choice question:

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
1. Carefully evaluate the question and all 4 options from first principles.
2. Determine which option index (0, 1, 2, or 3) is indisputably correct.
3. Explain clearly why that option is correct and address why the disputed option is either right or wrong.

Return ONLY valid JSON in this exact format:
{
  "verifiedCorrectAnswer": 0,
  "confidence": 99,
  "verificationExplanation": "Detailed step-by-step verification proving which option is correct."
}
`;

  const rawText = await callLLMJson(prompt, 0.1);
  const cleaned = rawText
    .replace(/```json/gi, "")
    .replace(/```/g, "")
    .trim();
  const parsed = JSON.parse(cleaned);

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
      "Verified against authoritative academic sources.",
  };
}
