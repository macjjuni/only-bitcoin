import type { Metadata } from "next";
import { fetchInitialBlocks } from "@/entities/block/server";
import { env } from "@/shared/config/env";
import { PageLayout } from "@/shared/ui/layout";
import { SoloMiningGuideArticle, SoloMiningPanel } from "@/views/solo-mining";

export const metadata: Metadata = {
  title: `${env.NEXT_PUBLIC_TITLE} - 솔로 마이닝 확률 계산기`,
  description:
    "실시간 채굴 난이도를 기준으로 내 해시레이트의 비트코인 블록 채굴 확률과 기대 소요 시간을 계산해 보세요. NerdMiner, Bitaxe 등 소형 채굴기도 지원합니다.",
  alternates: { canonical: "/solo-mining" },
};

export default async function SoloMiningPage() {
  const { blocks } = await fetchInitialBlocks();
  const initialDifficulty = blocks[0]?.difficulty ?? 0;

  return (
    <PageLayout className="gap-2.5">
      <SoloMiningPanel initialDifficulty={initialDifficulty} />
      <SoloMiningGuideArticle />
    </PageLayout>
  );
}
