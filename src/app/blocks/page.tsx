import { fetchInitialBlocks } from "@/entities/block/server";
import { createPageMetadata } from "@/shared/config/metadata";
import { PageLayout } from "@/shared/ui/layout";
import {
  BlocksExplorer,
  BlocksGuideArticle,
  BlocksVisualizer,
  HalvingChartCard,
  HalvingDataCard,
  RealtimeTxFees,
} from "@/views/blocks";

export const metadata = createPageMetadata({
  path: "/blocks",
  title: "Blocks",
  description: "비트코인 네트워크의 최신 블록 생성 현황과 트랜잭션 수수료를 실시간으로 확인하세요.",
});

export default async function BlocksPage() {
  const { blocks, fees, mempoolInfo } = await fetchInitialBlocks();
  const currentBlockHeight = blocks[0]?.height ?? 0;

  return (
    <PageLayout className="block-page__area gap-2.5">
      <BlocksVisualizer initialBlocks={blocks} />
      <RealtimeTxFees initialFees={fees} initialMempoolInfo={mempoolInfo} />
      <BlocksExplorer />
      <HalvingChartCard initialBlockHeight={currentBlockHeight} />
      <BlocksGuideArticle />
      <HalvingDataCard initialBlockHeight={currentBlockHeight} />
    </PageLayout>
  );
}
