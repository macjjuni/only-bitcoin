import type { Metadata } from "next";
import { env } from "@/shared/config/env";
import { PageLayout } from "@/shared/ui/layout";
import {
  BlocksExplorer,
  BlocksGuideArticle,
  BlocksVisualizer,
  BlockTxFees,
  HalvingChartCard,
  HalvingDataCard,
} from "@/views/blocks";

export const metadata: Metadata = {
  title: `${env.NEXT_PUBLIC_TITLE} - Blocks`,
  description: "비트코인 네트워크의 최신 블록 생성 현황과 트랜잭션 수수료를 실시간으로 확인하세요.",
};

export default function BlocksPage() {
  return (
    <PageLayout className="block-page__area">
      <BlocksVisualizer />
      <BlockTxFees />
      <BlocksExplorer />
      <HalvingChartCard />
      <BlocksGuideArticle />
      <HalvingDataCard />
    </PageLayout>
  );
}
