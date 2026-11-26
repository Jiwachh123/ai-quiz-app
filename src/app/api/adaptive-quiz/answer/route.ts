import { generateAdaptiveQuestions, AdaptiveQuestion } from "@/lib/adaptive-generator";
import { evaluateAdaptiveStep, AnswerSignal } from "@/lib/adaptive-engine";
import {
  Difficulty,
  ConfidenceLevel,
  ExamMode,
  AdaptiveDecisionLogEntry,
} from "@/types";
import { NextResponse } from "next/server";
import { decryptSession, encryptSession } from "@/lib/adaptive-session";

interface QuizSession {
  sessionId: string;
  topic: string;
  examMode?: ExamMode;
  syllabusText?: string;
  difficulty: Difficulty;
  totalQuestions: number;
  questions: AdaptiveQuestion[];
  answers: number[];
  questionTimes: number[];
  confidences: ConfidenceLevel[];
  recentHistory: AnswerSignal[];
  decisionLog: AdaptiveDecisionLogEntry[];
  currentIndex: number;
  correctCount: number;
  consecutiveCorrect: number;
  consecutiveWrong: number;
  createdAt: number;
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const { sessionToken, questionId, answer } = body;
    const timeTakenSec = Math.max(1, Math.round(Number(body.timeTakenSec) || 15));
    const confidence: ConfidenceLevel = ["low", "medium", "high"].includes(
      body.confidence
    )
      ? body.confidence
      : "medium";

    if (
      typeof sessionToken !== "string" ||
      typeof questionId !== "string" ||
      !Number.isInteger(answer) ||
      answer < -1 || // -1 = skipped or time over
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
      return NextResponse.json({ error: "Invalid quiz session" }, { status: 400 });
    }

    const currentQuestion = session.questions[session.currentIndex];
    if (currentQuestion.id !== questionId) {
      return NextResponse.json(
        { error: "Question does not match the session" },
        { status: 400 }
      );
    }

    session.answers = Array.isArray(session.answers) ? session.answers : [];
    session.questionTimes = Array.isArray(session.questionTimes)
      ? session.questionTimes
      : [];
    session.confidences = Array.isArray(session.confidences)
      ? session.confidences
      : [];
    session.recentHistory = Array.isArray(session.recentHistory)
      ? session.recentHistory
      : [];
    session.decisionLog = Array.isArray(session.decisionLog)
      ? session.decisionLog
      : [];

    session.answers.push(answer);
    session.questionTimes.push(timeTakenSec);
    session.confidences.push(confidence);

    const isCorrect = answer === currentQuestion.correctAnswer;
    if (isCorrect) {
      session.correctCount += 1;
    }

    // Evaluate with Smarter 4-Level Adaptive Engine (6-9 window + streak + time + confidence)
    const decision = evaluateAdaptiveStep({
      questionNumber: session.currentIndex + 1,
      questionText: currentQuestion.question,
      subtopic: currentQuestion.subtopic || session.topic,
      currentDifficulty: session.difficulty,
      isCorrect,
      timeTakenSec,
      confidence,
      correctStreak: session.consecutiveCorrect,
      wrongStreak: session.consecutiveWrong,
      recentHistory: session.recentHistory,
    });

    session.recentHistory.push({
      isCorrect,
      timeTakenSec,
      confidence,
      difficulty: session.difficulty,
    });
    // Keep last 9 answers in session token to keep token compact
    if (session.recentHistory.length > 9) {
      session.recentHistory = session.recentHistory.slice(-9);
    }

    session.difficulty = decision.nextDifficulty;
    session.consecutiveCorrect = decision.newCorrectStreak;
    session.consecutiveWrong = decision.newWrongStreak;
    if (answer === -1) {
      decision.logEntry.reason = `Question not attempted. Next difficulty: ${decision.nextDifficulty}.`;
    }
    session.decisionLog.push(decision.logEntry);

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
      decisionEntry: decision.logEntry,
      correctCount: session.correctCount,
      answeredCount: session.currentIndex,
      totalQuestions: session.totalQuestions,
      completed,
    };

    if (completed) {
      return NextResponse.json({
        ...result,
        completedQuizData: {
          topic: session.topic,
          examMode: session.examMode || "custom",
          questions: session.questions,
          answers: session.answers,
          questionTimes: session.questionTimes,
          confidences: session.confidences,
          decisionLog: session.decisionLog,
        },
      });
    }

    if (session.currentIndex >= session.questions.length) {
      const remainingQuestions = session.totalQuestions - session.currentIndex;
      const batchSize = Math.min(3, remainingQuestions);

      const newQuestions = await generateAdaptiveQuestions(
        session.topic,
        session.difficulty,
        batchSize,
        session.examMode || "custom",
        session.syllabusText
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
