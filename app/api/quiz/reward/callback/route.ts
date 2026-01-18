import { NextResponse } from 'next/server';
import { env } from "@/shared/config/env";
import * as bolt11 from 'bolt11';

// region [Privates]
const BLINK_API_URL = "https://api.blink.sv/graphql";
const BLINK_ACCESS_TOKEN = process.env?.BLINK_ACCESS_TOKEN || '';

const isDev = process.env.NODE_ENV === 'development';
const DOMAIN = isDev
  ? 'https://unresonant-elfreda-unreasonably.ngrok-free.dev'
  : env.NEXT_PUBLIC_URL;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'ngrok-skip-browser-warning': 'true',
};

const getBlinkWalletId = async () => {
  const response = await fetch(BLINK_API_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-API-KEY": BLINK_ACCESS_TOKEN || "" },
    body: JSON.stringify({ query: `query { me { defaultAccount { defaultWalletId } } }` }),
  });
  const result = await response.json();
  return result.data?.me?.defaultAccount?.defaultWalletId;
};
// endregion

// region [Transactions]
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const k1 = searchParams.get('k1');
  const pr = searchParams.get('pr');
  const amount = Number(searchParams.get('amount') || "100");

  // [STEP 1] 지갑이 정보를 물어볼 때
  if (!pr) {
    const milliSats = amount * 1000;
    return NextResponse.json({
      tag: "withdrawRequest",
      callback: `${DOMAIN}/api/quiz/reward/callback?amount=${amount}`,
      k1: k1 || "🎁 Quiz Reward(only-btc.app)",
      defaultDescription: "🎁 Quiz Reward(only-btc.app)",
      minWithdrawable: milliSats,
      maxWithdrawable: milliSats,
    }, { headers: corsHeaders });
  }

  // [STEP 2] 송금 실행 및 검증
  try {
    const decoded = bolt11.decode(pr);

    // 1. 금액 조작 검증
    if (decoded.satoshis !== amount) {
      return NextResponse.json({ status: "ERROR", reason: "Amount mismatch" }, { headers: corsHeaders });
    }

    // 2. Blink 송금
    const walletId = await getBlinkWalletId();
    const response = await fetch(BLINK_API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-API-KEY": BLINK_ACCESS_TOKEN || "" },
      body: JSON.stringify({
        query: `mutation LnInvoicePaymentSend($input: LnInvoicePaymentInput!) {
          lnInvoicePaymentSend(input: $input) { status errors { message } }
        }`,
        variables: { input: { walletId, paymentRequest: pr, memo: "Quiz Reward" } },
      }),
    });

    const result = await response.json();
    if (result.data?.lnInvoicePaymentSend?.status === "SUCCESS") {
      return NextResponse.json({ status: "OK" }, { headers: corsHeaders });
    }

    return NextResponse.json({ status: "ERROR", reason: "Payout failed" }, { headers: corsHeaders });
  } catch (error) {
    return NextResponse.json({ status: "ERROR", reason: "Invalid request" }, { headers: corsHeaders });
  }
}

export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders });
}
// endregion