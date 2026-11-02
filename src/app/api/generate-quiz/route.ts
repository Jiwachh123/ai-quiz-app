
import { NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { v4 as uuidv4 } from "uuid";

export const maxDuration = 120;

type Difficulty = "easy" | "medium" | "hard";

function createPrompt(
  topic: string,
  count: number,
  difficulty: Difficulty
) {
  return `Generate exactly ${count} educational multiple-choice questions about "${topic}".

Difficulty: ${difficulty}.

Rules:
- Exactly 4 options per question.
- Exactly one correct answer.
- correctAnswer must be an integer: 0, 1, 2, or 3.
- Include a short explanation.
- Return a JSON object with a "questions" array.
- Do not include markdown or text outside the JSON.`;
}

function parseQuestions(
  text: string,
  count: number,
  topic: string,
  difficulty: Difficulty
) {
  const cleaned = text
    .replace(/```json/gi, "")
    .replace(/```/g, "")
    .trim();

  const parsed = JSON.parse(cleaned);
  const questions = Array.isArray(parsed)
    ? parsed
    : parsed.questions;

  if (!Array.isArray(questions) || questions.length !== count) {
    throw new Error("AI returned an incorrect question count");
  }

  if (
    questions.some(
      (q: any) =>
        typeof q.question !== "string" ||
        !Array.isArray(q.options) ||
        q.options.length !== 4 ||
        q.options.some((option: any) => typeof option !== "string") ||
        !Number.isInteger(q.correctAnswer) ||
        q.correctAnswer < 0 ||
        q.correctAnswer > 3
    )
  ) {
    throw new Error("AI returned invalid question data");
  }

  return questions.map((q: any) => ({
    id: uuidv4(),
    question: q.question,
    options: q.options,
    correctAnswer: q.correctAnswer,
    explanation: q.explanation || "",
    difficulty,
    topic,
  }));
}

async function withTimeout<T>(
  promise: Promise<T>,
  milliseconds = 12000
): Promise<T> {
  let timer: ReturnType<typeof setTimeout>;

  try {
    return await Promise.race([
      promise,
      new Promise<T>((_, reject) => {
        timer = setTimeout(
          () => reject(new Error("Provider timed out")),
          milliseconds
        );
      }),
    ]);
  } finally {
    clearTimeout(timer!);
  }
}

async function generateWithGroq(
  prompt: string,
  count: number,
  topic: string,
  difficulty: Difficulty
) {
  const key = process.env.GROQ_API_KEY;
  if (!key) throw new Error("Groq key missing");

  const response = await fetch(
    "https://api.groq.com/openai/v1/chat/completions",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${key}`,
      },
      body: JSON.stringify({
        model: "openai/gpt-oss-20b",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.3,
        max_tokens: 3000,
        response_format: { type: "json_object" },
      }),
      signal: AbortSignal.timeout(12000),
    }
  );

  if (!response.ok) {
    throw new Error(`Groq error: ${response.status}`);
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content;

  if (!content) throw new Error("Groq returned empty response");

  return parseQuestions(content, count, topic, difficulty);
}

async function generateWithGemini(
  prompt: string,
  count: number,
  topic: string,
  difficulty: Difficulty
) {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error("Gemini key missing");

  const genAI = new GoogleGenerativeAI(key);
  const model = genAI.getGenerativeModel({
    model: "gemini-3.8-flash",
  });

  const result = await withTimeout(
    model.generateContent(prompt),
    12000
  );

  return parseQuestions(
    result.response.text(),
    count,
    topic,
    difficulty
  );
}

async function generateWithOpenRouter(
  prompt: string,
  count: number,
  topic: string,
  difficulty: Difficulty
) {
  const key = process.env.OPENROUTER_API_KEY;
  if (!key) throw new Error("OpenRouter key missing");

  const response = await fetch(
    "https://openrouter.ai/api/v1/chat/completions",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${key}`,
        "HTTP-Referer": "http://localhost:3002",
        "X-Title": "AI Quiz Master",
      },
      body: JSON.stringify({
        model: "meta-llama/llama-3.3-70b-instruct",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.3,
        max_tokens: 3000,
        response_format: { type: "json_object" },
      }),
      signal: AbortSignal.timeout(12000),
    }
  );

  if (!response.ok) {
    throw new Error(`OpenRouter error: ${response.status}`);
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content;

  if (!content) throw new Error("OpenRouter returned empty response");

  return parseQuestions(content, count, topic, difficulty);
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const topic =
      typeof body.topic === "string" ? body.topic.trim() : "";

    const count = Number(body.count);
    const difficulty = body.difficulty as Difficulty;

    if (
      !topic ||
      topic.length > 200 ||
      !Number.isInteger(count) ||
      count < 1 ||
      count > 50 ||
      !["easy", "medium", "hard"].includes(difficulty)
    ) {
      return NextResponse.json(
        { error: "Invalid quiz details" },
        { status: 400 }
      );
    }

    const allQuestions = [];
    const batchSize = 5;

    for (let i = 0; i < count; i += batchSize) {
      const currentCount = Math.min(batchSize, count - i);

      const prompt = createPrompt(
        topic,
        currentCount,
        difficulty
      );

      const providers = [
        {
          name: "Groq",
          generate: () =>
            generateWithGroq(
              prompt,
              currentCount,
              topic,
              difficulty
            ),
        },
        {
          name: "Gemini",
          generate: () =>
            generateWithGemini(
              prompt,
              currentCount,
              topic,
              difficulty
            ),
        },
        {
          name: "OpenRouter",
          generate: () =>
            generateWithOpenRouter(
              prompt,
              currentCount,
              topic,
              difficulty
            ),
        },
      ];

      let batchQuestions = null;

      for (const provider of providers) {
        try {
          batchQuestions = await provider.generate();

          console.log(
            `${provider.name} generated batch ${Math.floor(i / batchSize) + 1}`
          );

          break;
        } catch (error) {
          console.warn(`${provider.name} failed:`, error);
        }
      }

      if (!batchQuestions) {
        throw new Error("All AI providers failed for a batch");
      }

      allQuestions.push(...batchQuestions);
    }

    return NextResponse.json({
      questions: allQuestions,
    });
  } catch (error) {
    console.error("Quiz generation failed:", error);

    return NextResponse.json(
      { error: "Quiz generation failed. Please try again." },
      { status: 503 }
    );
  }
}
