import { generateAdaptiveQuestions, AdaptiveQuestion, Difficulty } from "@/lib/adaptive-generator";
import { NextResponse } from "next/server";
import { decryptSession, encryptSession } from "@/lib/adaptive-session";

interface QuizSession {
  sessionId: string;
  topic: string;
  difficulty: Difficulty;
  totalQuestions: number;
  questions: AdaptiveQuestion[];
  answers: number[];
  currentIndex: number;
  correctCount: number;
  consecutiveCorrect: number;
  consecutiveWrong: number;
  createdAt: number;
}

function getNextDifficulty(
  current: Difficulty,
  correctStreak: number,
  wrongStreak: number
): Difficulty {
  const levels: Difficulty[] = ["easy", "medium", "hard"];
  const currentIndex = levels.indexOf(current);

  if (correctStreak >= 2) {
    return levels[Math.min(currentIndex + 1, 2)];
  }

  if (wrongStreak >= 2) {
    return levels[Math.max(currentIndex - 1, 0)];
  }

  return current;
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const { sessionToken, questionId, answer } = body;

    if (
      typeof sessionToken !== "string" ||
      typeof questionId !== "string" ||
      !Number.isInteger(answer) ||
      answer < 0 ||
      answer > 3
    ) {
      return NextResponse.json(
        { error: "Invalid answer submission" },
        { status: 400 }
      );
    }

    const session = decryptSession<QuizSession>(sessionToken);

    if (
      !session.questions ||
      !Number.isInteger(session.currentIndex) ||
      session.currentIndex < 0 ||
      session.currentIndex >= session.questions.length
    ) {
      return NextResponse.json(
        { error: "Invalid quiz session" },
        { status: 400 }
      );
    }

    const currentQuestion = session.questions[session.currentIndex];

    if (currentQuestion.id !== questionId) {
      return NextResponse.json(
        { error: "Question does not match the session" },
        { status: 400 }
      );
    }

    if (!Array.isArray(session.answers)) {
      session.answers = [];
    }
    session.answers.push(answer);

    const isCorrect = answer === currentQuestion.correctAnswer;

    if (isCorrect) {
      session.correctCount += 1;
      session.consecutiveCorrect += 1;
      session.consecutiveWrong = 0;
    } else {
      session.consecutiveWrong += 1;
      session.consecutiveCorrect = 0;
    }

    const previousDifficulty = session.difficulty;

    session.difficulty = getNextDifficulty(
      session.difficulty,
      session.consecutiveCorrect,
      session.consecutiveWrong
    );

    if (session.difficulty !== previousDifficulty) {
      session.consecutiveCorrect = 0;
      session.consecutiveWrong = 0;
    }

    session.currentIndex += 1;

    const completed = session.currentIndex >= session.totalQuestions;

    const result = {
      isCorrect,
      correctAnswer: currentQuestion.correctAnswer,
      explanation: currentQuestion.explanation,
      difficulty: currentQuestion.difficulty,
      subtopic: currentQuestion.subtopic || session.topic,
      verification: currentQuestion.verification,
      nextDifficulty: session.difficulty,
      correctCount: session.correctCount,
      answeredCount: session.currentIndex,
      totalQuestions: session.totalQuestions,
      completed,
    };

    if (completed) {
      // Return full verified questions & user answers so client can permanently store the completed quiz & attempt
      return NextResponse.json({
        ...result,
        completedQuizData: {
          topic: session.topic,
          questions: session.questions,
          answers: session.answers,
        },
      });
    }

    if (session.currentIndex >= session.questions.length) {
      const remainingQuestions = session.totalQuestions - session.currentIndex;
      const batchSize = Math.min(3, remainingQuestions);

      const newQuestions = await generateAdaptiveQuestions(
        session.topic,
        session.difficulty,
        batchSize
      );

      session.questions.push(...newQuestions);
    }

    const nextQuestion = session.questions[session.currentIndex];

    return NextResponse.json({
      ...result,
      needsNextBatch: false,
      sessionToken: encryptSession(session),
      question: {
        id: nextQuestion.id,
        question: nextQuestion.question,
        options: nextQuestion.options,
        difficulty: nextQuestion.difficulty,
        subtopic: nextQuestion.subtopic || session.topic,
        verification: nextQuestion.verification,
      },
    });
  } catch (error) {
    console.error("Adaptive answer error:", error);

    return NextResponse.json(
      { error: "Could not check this answer" },
      { status: 400 }
    );
  }
}
