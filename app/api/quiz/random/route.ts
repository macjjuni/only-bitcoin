import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { QUIZ_COOKIE_KEY, QUIZ_MIN_COUNT } from "@/shared/constants/setting";
import { quizData } from "@/shared/constants/quiz";

// region [Privates]
const LIMIT_KEY = `${QUIZ_COOKIE_KEY}_done`;
const BLINK_API_URL = "https://api.blink.sv/graphql";
const MIN_BALANCE_SATS = 500;

/**
 * 서버 사이드 참여 자격 검증
 */
const checkServerEligibility = async () => {
  const cookieStore = await cookies();

  // 1. 쿨다운 체크
  if (cookieStore.get(LIMIT_KEY)) {
    return { eligible: false, reason: "COOLDOWN" };
  }

  // 2. 카운트 체크
  const countRaw = cookieStore.get(QUIZ_COOKIE_KEY)?.value;
  const count = parseInt(countRaw || "0");

  if (count < QUIZ_MIN_COUNT) {
    return { eligible: false, reason: "INSUFFICIENT_COUNT" };
  }

  return { eligible: true };
};


const getRandomQuiz = () => {
  const randomIndex = Math.floor(Math.random() * quizData.length);
  return quizData[randomIndex];
};
// endregion

// region [Transactions]

/** Blink API를 통한 현재 지갑 잔액 조회 */
const fetchWalletBalance = async (): Promise<number> => {
  const query = `
    query Me {
      me {
        defaultAccount {
          wallets {
            walletCurrency
            balance
          }
        }
      }
    }
  `;

  try {
    const response = await fetch(BLINK_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-API-KEY": process.env?.BLINK_ACCESS_TOKEN || '',
      },
      body: JSON.stringify({ query }),
    });

    const result = await response.json();
    const wallets = result.data?.me?.defaultAccount?.wallets || [];

    // BTC 지갑 찾기 (일반적으로 BTC 단위의 잔액 반환)
    const btcWallet = wallets.find((w: any) => w.walletCurrency === "BTC");
    return btcWallet ? btcWallet.balance : 0;
  } catch (error) {
    console.error("Blink Balance Fetch Error:", error);
    return 0;
  }
};

export async function GET() {
  try {
    const isDev = process.env.NODE_ENV === "development";

    // 개발 환경: 조건 없이 바로 퀴즈 반환
    if (isDev) {
      const quiz = getRandomQuiz();
      const { answer: _, ...quizWithoutAnswer } = quiz;
      return NextResponse.json({ success: true, data: quizWithoutAnswer });
    }

    // 프로덕션 환경: 자격 검증
    // 1. 기본 자격 검증 (쿠키 등)
    const { eligible, reason } = await checkServerEligibility();
    if (!eligible) {
      return NextResponse.json({ success: false, error: reason }, { status: 403 });
    }

    // 2. 지갑 잔액 확인 (주머니 사정 체크)
    const currentBalance = await fetchWalletBalance();
    console.log('currentBalance', currentBalance);
    if (currentBalance < MIN_BALANCE_SATS) {
      return NextResponse.json({ success: false, error: "PROBABILITY_FAIL" });
    }

    // 3. 서버 확률 계산 (20% 확률)
    const isWinner = Math.random() < 0.2;

    if (isWinner) {
      const quiz = getRandomQuiz();
      const { answer: _, ...quizWithoutAnswer } = quiz;
      return NextResponse.json({
        success: true,
        data: quizWithoutAnswer
      });
    }

    return NextResponse.json({ success: false, error: "PROBABILITY_FAIL" });

  } catch (error) {
    console.error("Quiz API Error:", error);
    return NextResponse.json(
      { success: false, error: "INTERNAL_SERVER_ERROR" },
      { status: 500 }
    );
  }
}
// endregion