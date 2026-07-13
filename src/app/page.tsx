import type { Metadata } from "next";
import { env } from "@/shared/config/env";
import { OverviewScreen } from "@/views/overview";

export const metadata: Metadata = {
  title: env.NEXT_PUBLIC_TITLE,
  description:
    "비트코인(BTC) 실시간 시세, 해시레이트, 채굴 난이도 및 간략한 차트, 반감기 정보를 한 화면에서 실시간으로 확인하세요.",
  alternates: { canonical: "/overview" },
};

export default function Home() {
  return <OverviewScreen />;
}
