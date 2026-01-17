import { NextResponse } from "next/server";
import { bech32 } from "bech32";
import { v4 as uuidv4 } from "uuid";
import { env } from "@/shared/config/env";

const isDev = process.env.NODE_ENV === "development";
const DOMAIN = isDev ? "https://unresonant-elfreda-unreasonably.ngrok-free.dev" : env.NEXT_PUBLIC_URL;

const encodeLnurl = (url: string) => {
  const words = bech32.toWords(Buffer.from(url, "utf8"));
  return bech32.encode("lnurl", words, 2000).toUpperCase();
};


export async function POST(_: Request) {
  try {
    const k1 = uuidv4();
    const amountSats = 100;

    // 지갑이 실제 인출 시 접속할 Callback URL 구성
    const callbackUrl = `${DOMAIN}/api/quiz/reward/callback?k1=${k1}&amount=${amountSats}`;
    const lnurl = encodeLnurl(callbackUrl);

    return NextResponse.json({
      success: true,
      lnurl // 클라이언트는 이 문자열로 QR코드를 생성합니다.
    });
  } catch (error) {
    return NextResponse.json({ success: false }, { status: 500 });
  }
}