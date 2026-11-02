import { GoogleGenerativeAI } from "@google/generative-ai";
import { v4 as uuidv4 } from "uuid";

export type Difficulty = "easy" | "medium" | "hard";

export interface AdaptiveQuestion {
  id: string;
  question: string;
  options: string[];
  correctAnswer: number;
  explanation: string;
  difficulty: Difficulty;
  topic: string;
}

function getPrompt(
  topic: string,
  difficulty: Difficulty,
  count: number
) {
  return `
Generate exactly ${count} multiple-choice quiz questions.

Topic: ${topic}
Difficulty: ${difficulty}

Rules:
- Each question must have exactly 4 options.
- Only one option must be correct.
- correctAnswer must be the zero-based option index (0, 1, 2, or 3).
- Include a clear explanation.
- Return valid JSON only.

Required format:
{
  "questions": [
    {
      "question": "Question text",
      "options": ["A", "B", "C", "D"],
      "correctAnswer": 0,
      "explanation": "Explanation"
    }
  ]
}
`;
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
  const questions = Array.isArray(parsed)
    ? parsed
    : parsed.questions;

  if (!Array.isArray(questions) || questions.length !== count) {
    throw new Error("AI returned an incorrect number of questions.");
  }

  return questions.map((q: any) => {
    if (
      typeof q.question !== "string" ||
      !Array.isArray(q.options) ||
      q.options.length !== 4 ||
      !Number.isInteger(q.correctAnswer) ||
      q.correctAnswer < 0 ||
      q.correctAnswer > 3 ||
      typeof q.explanation !== "string"
    ) {
      throw new Error("AI returned an invalid question.");
    }

    return {
      id: uuidv4(),
      question: q.question,
      options: q.options,
      correctAnswer: q.correctAnswer,
      explanation: q.explanation,
      difficulty,
      topic,
    };
  });
}

async function generateWithGroq(
  prompt: string,
  topic: string,
  difficulty: Difficulty,
  count: number
) {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) throw new Error("Groq API key missing.");

  const response = await fetch(
    "https://api.groq.com/openai/v1/chat/completions",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "openai/gpt-oss-20b",
        messages: [{ role: "user", content: prompt }],
        response_format: { type: "json_object" },
      }),
      signal: AbortSignal.timeout(20000),
    }
  );

  if (!response.ok) throw new Error("Groq request failed.");

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content;

  if (!content) throw new Error("Groq returned an empty response.");

  return parseQuestions(content, topic, difficulty, count);
}

async function generateWithGemini(
  prompt: string,
  topic: string,
  difficulty: Difficulty,
  count: number
) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("Gemini API key missing.");

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({
    model: "gemini-3.8-flash",
    generationConfig: {
      responseMimeType: "application/json",
    },
  });

  const result = await Promise.race([
    model.generateContent(prompt),
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error("Gemini timed out.")), 20000)
    ),
  ]);

  return parseQuestions(
    result.response.text(),
    topic,
    difficulty,
    count
  );
}

async function generateWithOpenRouter(
  prompt: string,
  topic: string,
  difficulty: Difficulty,
  count: number
) {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) throw new Error("OpenRouter API key missing.");

  const response = await fetch(
    "https://openrouter.ai/api/v1/chat/completions",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "meta-llama/llama-3.3-70b-instruct",
        messages: [{ role: "user", content: prompt }],
        response_format: { type: "json_object" },
      }),
      signal: AbortSignal.timeout(20000),
    }
  );

  if (!response.ok) throw new Error("OpenRouter request failed.");

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content;

  if (!content) throw new Error("OpenRouter returned an empty response.");

  return parseQuestions(content, topic, difficulty, count);
}

export async function generateAdaptiveQuestions(
  topic: string,
  difficulty: Difficulty,
  count: number
): Promise<AdaptiveQuestion[]> {
  const prompt = getPrompt(topic, difficulty, count);

  const providers = [
    () => generateWithGroq(prompt, topic, difficulty, count),
    () => generateWithGemini(prompt, topic, difficulty, count),
    () => generateWithOpenRouter(prompt, topic, difficulty, count),
  ];

  for (const provider of providers) {
    try {
      return await provider();
    } catch (error) {
      console.error("AI provider failed:", error);
    }
  }

  throw new Error("All AI providers failed to generate questions.");
}