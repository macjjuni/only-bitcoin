import type { Metadata } from "next";
import { fetchInitialBlocks } from "@/entities/block/server";
import { env } from "@/shared/config/env";
import { PageLayout } from "@/shared/ui/layout";
import { HalvingCountdown } from "@/views/blocks";
import CosmicBackdrop from "@/views/blocks/ui/halving-countdown/CosmicBackdrop";

const SERVICE_DOMAIN = env.NEXT_PUBLIC_URL.replace(/^https?:\/\/(www\.)?/, "");

export const metadata: Metadata = {
  title: `${env.NEXT_PUBLIC_TITLE} - Halving Countdown`,
  description:
    "비트코인 다음 반감기까지 남은 시간을 실시간으로 확인하세요. 현재 블록 높이와 남은 블록 수, 예상 반감기 날짜를 함께 제공합니다.",
  alternates: {
    canonical: "/blocks/countdown",
  },
};

export default async function Page() {
  const { blocks } = await fetchInitialBlocks();
  const currentBlockHeight = blocks[0]?.height ?? 0;

  return (
    // 배경이 테마와 무관하게 딥 스페이스 톤이므로 본문 색도 밝은 쪽으로 고정.
    <PageLayout className="text-white/70 p-4" hasBottomNav={false}>
      <CosmicBackdrop />
      <p className="relative z-10 w-full text-center text-lg font-bold text-white/70 select-none">
        {SERVICE_DOMAIN}
      </p>
      <HalvingCountdown initialBlockHeight={currentBlockHeight} />
    </PageLayout>
  );
}
