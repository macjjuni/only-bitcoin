import { NextResponse } from "next/server";
import { bech32 } from "bech32";
import { v4 as uuidv4 } from "uuid";
import { env } from "@/shared/config/env";
import { activateRewardToken } from "@/shared/api/quiz-rewards";

// region [Types]
interface GenerateRequest {
  answerToken: string;
}
// endregion

const isDev = process.env.NODE_ENV === "development";
const DOMAIN = isDev ? "https://unresonant-elfreda-unreasonably.ngrok-free.dev" : env.NEXT_PUBLIC_URL;

// region [Privates]
const encodeLnurl = (url: string) => {
  const words = bech32.toWords(Buffer.from(url, "utf8"));
  return bech32.encode("lnurl", words, 2000).toUpperCase();
};
// endregion


// region [Transactions]
export async function POST(request: Request) {
  try {
    const body: GenerateRequest = await request.json();
    const { answerToken } = body;

    // answerToken 필수 검증
    if (!answerToken) {
      return NextResponse.json(
        { success: false, error: "MISSING_ANSWER_TOKEN" },
        { status: 400 }
      );
    }

    // reward_token 생성 및 PENDING → READY 상태 변경 (atomic)
    const rewardToken = uuidv4();
    const tokenResult = await activateRewardToken(answerToken, rewardToken);

    if (!tokenResult.valid) {
      return NextResponse.json(
        { success: false, error: tokenResult.reason },
        { status: 403 }
      );
    }

    // 지갑이 실제 인출 시 접속할 Callback URL 구성
    const callbackUrl = `${DOMAIN}/api/quiz/reward/callback?k1=${rewardToken}&amount=${tokenResult.amount}`;
    const lnurl = encodeLnurl(callbackUrl);

    return NextResponse.json({
      success: true,
      lnurl
    });
  } catch (error) {
    console.error("Generate Error:", error);
    return NextResponse.json({ success: false, error: "INTERNAL_ERROR" }, { status: 500 });
  }
}
// endregion
