import { NextResponse } from "next/server";
import { quizData } from "@/shared/constants/quiz";


export async function GET() {
  // region [Privates]
  /**
   * 서버 최종 확률 검증 로직
   * 개발 모드에서는 무조건 통과 (100%)
   */
  const checkFinalProbability = () => {
    // NODE_ENV가 development면 무조건 true 반환
    if (process.env.NODE_ENV === "development") return true;

    const SERVER_CHANCE = 0.105;
    return Math.random() < SERVER_CHANCE;
  };

  const getRandomQuiz = () => {
    return quizData[Math.floor(Math.random() * quizData.length)];
  };
  // endregion

  // region [Transactions]
  try {
    const isWinner = checkFinalProbability();

    if (isWinner) {
      const quiz = getRandomQuiz();
      return NextResponse.json({
        success: true,
        data: quiz
      });
    }

    return NextResponse.json({
      success: false,
      message: "Probability check not passed"
    });

  } catch (error) {
    console.error("Quiz API Error:", error);
    return NextResponse.json(
      { success: false, message: "Internal Server Error" },
      { status: 500 }
    );
  }
  // endregion
}