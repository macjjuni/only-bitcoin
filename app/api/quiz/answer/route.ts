import { NextResponse } from "next/server";
import { v4 as uuidv4 } from "uuid";
import { quizData } from "@/shared/constants/quiz";
import { createAnswerToken } from "@/shared/api/quiz-rewards";

// region [Types]
interface AnswerRequest {
  quizId: string;
  answer: string;
}
// endregion


// region [Transactions]
export async function POST(request: Request) {
  try {
    const body: AnswerRequest = await request.json();
    const { quizId, answer } = body;

    // 필수 파라미터 검증
    if (!quizId || !answer) {
      return NextResponse.json(
        { success: false, reason: "INVALID_REQUEST" },
        { status: 400 }
      );
    }

    // 퀴즈 찾기
    const quiz = quizData.find((q) => q.id === quizId);
    if (!quiz) {
      return NextResponse.json(
        { success: false, reason: "QUIZ_NOT_FOUND" },
        { status: 404 }
      );
    }

    // 정답 검증
    if (quiz.answer !== answer) {
      return NextResponse.json(
        { success: false, reason: "WRONG_ANSWER" },
        { status: 200 }
      );
    }

    // 정답! answerToken 발급
    const answerToken = uuidv4();
    const { success, error } = await createAnswerToken(answerToken, quizId);

    if (!success) {
      console.error("Answer Token Create Error:", error);
      return NextResponse.json(
        { success: false, reason: "DB_ERROR" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      answerToken
    });
  } catch (error) {
    console.error("Quiz Answer API Error:", error);
    return NextResponse.json(
      { success: false, reason: "INTERNAL_ERROR" },
      { status: 500 }
    );
  }
}
// endregion