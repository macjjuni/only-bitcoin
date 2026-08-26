import { fetchInitialBlocks } from "@/entities/block/server";
import { createFaqSchema } from "@/shared/config/jsonLd";
import { createPageMetadata } from "@/shared/config/metadata";
import { JsonLd } from "@/shared/ui";
import { PageLayout } from "@/shared/ui/layout";
import {
  BLOCKS_FAQ,
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
      <JsonLd schema={createFaqSchema(BLOCKS_FAQ)} />
      <BlocksVisualizer initialBlocks={blocks} />
      <RealtimeTxFees initialFees={fees} initialMempoolInfo={mempoolInfo} />
      <BlocksExplorer />
      <HalvingChartCard initialBlockHeight={currentBlockHeight} />
      <BlocksGuideArticle />
      <HalvingDataCard initialBlockHeight={currentBlockHeight} />
    </PageLayout>
  );
}
