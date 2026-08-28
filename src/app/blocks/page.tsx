import { fetchInitialBlocks } from "@/entities/block/server";
import { createFaqSchema } from "@/shared/config/jsonLd";
import { createPageMetadata } from "@/shared/config/metadata";
import { JsonLd, PageTitle } from "@/shared/ui";
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
    <PageLayout className="block-page__area gap-2.5 font-pretendard">
      <JsonLd schema={createFaqSchema(BLOCKS_FAQ)} />
      {/* 블록 시각화가 곧 화면이라 제목 UI 를 두지 않음. 제목 신호만 심음. */}
      <PageTitle srOnly label="Blocks" title="비트코인 블록과 트랜잭션 수수료" />
      <BlocksVisualizer initialBlocks={blocks} />
      <RealtimeTxFees initialFees={fees} initialMempoolInfo={mempoolInfo} />
      <BlocksExplorer />
      <HalvingChartCard initialBlockHeight={currentBlockHeight} />
      <BlocksGuideArticle />
      <HalvingDataCard initialBlockHeight={currentBlockHeight} />
    </PageLayout>
  );
}
