import * as bolt11 from "bolt11";
import { NextResponse } from "next/server";
import {
  claimRewardToken,
  releaseRewardToken,
  validateRewardToken,
} from "@/entities/quiz/api/quiz-rewards";
import { sendLnPayment } from "@/entities/wallet/api/blink";
import { env } from "@/shared/config/env";

// region [Privates]
const isDev = process.env.NODE_ENV === "development";
const DOMAIN = isDev
  ? "https://unresonant-elfreda-unreasonably.ngrok-free.dev"
  : env.NEXT_PUBLIC_URL;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
  "ngrok-skip-browser-warning": "true",
};
// endregion

// region [Transactions]
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const k1 = searchParams.get("k1");
  const pr = searchParams.get("pr");

  // k1(reward_token) 필수 검증
  if (!k1) {
    return NextResponse.json({ status: "ERROR", reason: "Missing k1" }, { headers: corsHeaders });
  }

  // [STEP 1] 지갑이 정보를 물어볼 때
  if (!pr) {
    const result = await validateRewardToken(k1);
    if (!result.valid) {
      return NextResponse.json(
        { status: "ERROR", reason: result.reason },
        { headers: corsHeaders },
      );
    }

    const milliSats = result.amount * 1000;
    return NextResponse.json(
      {
        tag: "withdrawRequest",
        callback: `${DOMAIN}/api/quiz/reward/callback?k1=${k1}`,
        k1,
        defaultDescription: "🎁 Quiz Reward(only-btc.app)",
        minWithdrawable: milliSats,
        maxWithdrawable: milliSats,
      },
      { headers: corsHeaders },
    );
  }

  // [STEP 2] 송금 실행 및 검증
  try {
    // 토큰 선점 (atomic) - Race Condition 방지
    const claimResult = await claimRewardToken(k1);
    if (!claimResult.valid) {
      return NextResponse.json(
        { status: "ERROR", reason: claimResult.reason },
        { headers: corsHeaders },
      );
    }

    const decoded = bolt11.decode(pr);

    // 금액 조작 검증
    if (decoded.satoshis !== claimResult.amount) {
      await releaseRewardToken(k1); // 롤백
      return NextResponse.json(
        { status: "ERROR", reason: "Amount mismatch" },
        { headers: corsHeaders },
      );
    }

    // Blink 송금
    const paymentResult = await sendLnPayment(pr);
    if (paymentResult.success) {
      return NextResponse.json({ status: "OK" }, { headers: corsHeaders });
    }

    // 송금 실패 시 롤백
    await releaseRewardToken(k1);
    return NextResponse.json(
      { status: "ERROR", reason: paymentResult.error || "Payout failed" },
      { headers: corsHeaders },
    );
  } catch {
    await releaseRewardToken(k1); // 예외 발생 시 롤백
    return NextResponse.json(
      { status: "ERROR", reason: "Invalid request" },
      { headers: corsHeaders },
    );
  }
}

export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders });
}
// endregion
