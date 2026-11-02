import { GoogleGenerativeAI } from "@google/generative-ai";
import { Question } from "@/types";
import { v4 as uuidv4 } from "uuid";

const groqApiKey = process.env.NEXT_PUBLIC_GROQ_API_KEY || "";
const geminiApiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY || "";
const openRouterApiKey = process.env.NEXT_PUBLIC_OPENROUTER_API_KEY || "";

const genAI = new GoogleGenerativeAI(geminiApiKey);

// ========== COMMON PROMPT ==========
function createPrompt(
  topic: string,
  count: number,
  difficulty: "easy" | "medium" | "hard"
) {
  return `You are an expert educational quiz generator.

Generate EXACTLY ${count} multiple-choice questions on the topic: "${topic}".
Difficulty level must be strictly: ${difficulty.toUpperCase()}

Rules:
1. Generate exactly ${count} questions.
2. Each question must have exactly 4 options.
3. Only one correct answer.
4. Make the difficulty strictly ${difficulty}.
5. Provide a short explanation for the correct answer.
6. Return ONLY a valid JSON array. No markdown, no extra text.

JSON Format:
[
  {
    "question": "Question text here?",
    "options": ["Option A", "Option B", "Option C", "Option D"],
    "correctAnswer": 0,
    "explanation": "Short explanation why this is correct.",
    "difficulty": "${difficulty}",
    "topic": "${topic}"
  }
]`;
}

// ========== PARSE RESPONSE ==========
function parseQuestions(
  text: string,
  count: number,
  topic: string,
  difficulty: "easy" | "medium" | "hard"
): Question[] {
  text = text.replace(/```json/g, "").replace(/```/g, "").trim();
  const parsed = JSON.parse(text);

  return parsed.slice(0, count).map((q: any) => ({
    id: uuidv4(),
    question: q.question,
    options: q.options,
    correctAnswer: Number(q.correctAnswer),
    explanation: q.explanation,
    difficulty: q.difficulty || difficulty,
    topic: q.topic || topic,
  }));
}

// ========== 1. GROQ (Primary) ==========
async function generateWithGroq(
  topic: string,
  count: number,
  difficulty: "easy" | "medium" | "hard"
): Promise<Question[]> {
  const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${groqApiKey}`,
    },
    body: JSON.stringify({
      model: "llama-3.3-70b-versatile",
      messages: [{ role: "user", content: createPrompt(topic, count, difficulty) }],
      temperature: 0.7,
      max_tokens: 4000,
    }),
  });

  if (!response.ok) throw new Error(`Groq error: ${response.status}`);
  const data = await response.json();
  return parseQuestions(data.choices[0]?.message?.content || "", count, topic, difficulty);
}

// ========== 2. GEMINI (Backup) ==========
async function generateWithGemini(
  topic: string,
  count: number,
  difficulty: "easy" | "medium" | "hard"
): Promise<Question[]> {
  const model = genAI.getGenerativeModel({ model: "gemini-3.8-flash" });
  const result = await model.generateContent(createPrompt(topic, count, difficulty));
  const response = await result.response;
  return parseQuestions(response.text(), count, topic, difficulty);
}

// ========== 3. OPENROUTER (Third) ==========
async function generateWithOpenRouter(
  topic: string,
  count: number,
  difficulty: "easy" | "medium" | "hard"
): Promise<Question[]> {
  const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${openRouterApiKey}`,
      "HTTP-Referer": "http://localhost:3000",
      "X-Title": "AI Quiz Master",
    },
    body: JSON.stringify({
      model: "meta-llama/llama-3.3-70b-instruct", // Good free/paid option
      messages: [{ role: "user", content: createPrompt(topic, count, difficulty) }],
      temperature: 0.7,
      max_tokens: 4000,
    }),
  });

  if (!response.ok) throw new Error(`OpenRouter error: ${response.status}`);
  const data = await response.json();
  return parseQuestions(data.choices[0]?.message?.content || "", count, topic, difficulty);
}

// ========== MAIN FUNCTION ==========
export async function generateQuestions(
  topic: string,
  count: number = 5,
  difficulty: "easy" | "medium" | "hard" = "medium"
): Promise<Question[]> {
  const batchSize = 10;
  const batches = Math.ceil(count / batchSize);
  const batchPromises = [];

  for (let i = 0; i < batches; i++) {
    const remaining = count - i * batchSize;
    const currentBatchSize = Math.min(batchSize, remaining);

    batchPromises.push(
      (async () => {
        // 1. Try Groq first
        if (groqApiKey) {
          try {
            console.log("✅ Using Groq (Primary)");
            return await generateWithGroq(topic, currentBatchSize, difficulty);
          } catch (error) {
            console.warn("Groq failed, trying Gemini...", error);
          }
        }

        // 2. Try Gemini
        if (geminiApiKey) {
          try {
            console.log("✅ Using Gemini (Backup)");
            return await generateWithGemini(topic, currentBatchSize, difficulty);
          } catch (error) {
            console.warn("Gemini failed, trying OpenRouter...", error);
          }
        }

        // 3. Try OpenRouter
        if (openRouterApiKey) {
          try {
            console.log("✅ Using OpenRouter (Third)");
            return await generateWithOpenRouter(topic, currentBatchSize, difficulty);
          } catch (error) {
            console.error("OpenRouter also failed:", error);
          }
        }

        // Final fallback
        console.warn("All AI providers failed. Using sample questions.");
        return generateFallbackQuestions(topic, currentBatchSize, difficulty);
      })()
    );
  }

  const results = await Promise.all(batchPromises);
  return results.flat().slice(0, count);
}

function generateFallbackQuestions(
  topic: string,
  count: number,
  difficulty: "easy" | "medium" | "hard"
): Question[] {
  const samples: Question[] = [];
  for (let i = 0; i < count; i++) {
    samples.push({
      id: uuidv4(),
      question: `Sample question ${i + 1} about ${topic}?`,
      options: ["Option A", "Option B", "Option C", "Option D"],
      correctAnswer: 0,
      explanation: "This is a sample explanation. Please check your API keys.",
      difficulty,
      topic,
    });
  }
  return samples;
}

export async function generateAdaptiveQuestion(
  topic: string,
  previousDifficulty: "easy" | "medium" | "hard",
  wasCorrect: boolean
): Promise<Question> {
  let nextDifficulty: "easy" | "medium" | "hard" = previousDifficulty;

  if (wasCorrect) {
    if (previousDifficulty === "easy") nextDifficulty = "medium";
    else if (previousDifficulty === "medium") nextDifficulty = "hard";
  } else {
    if (previousDifficulty === "hard") nextDifficulty = "medium";
    else if (previousDifficulty === "medium") nextDifficulty = "easy";
  }

  const questions = await generateQuestions(topic, 1, nextDifficulty);
  return questions[0];
}