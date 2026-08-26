import { fetchInitialMacro, fetchInitialPrice } from "@/entities/bitcoin/server";
import { fetchInitialBlocks } from "@/entities/block/server";
import { PageTitle } from "@/shared/ui";
import { PageLayout } from "@/shared/ui/layout";
import BlockHalvingCard from "../block-halving-card/BlockHalvingCard";
import ClientChart from "../clientChart/ClientChart";
import MacroWidgetPanel from "../macro-widget-panel/MacroWidgetPanel";
import PricePanel from "../price-panel/PricePanel";

/**
 * Overview 화면 구성.
 * `/`와 `/overview` 두 라우트에서 동일하게 렌더링
 */
export default async function OverviewScreen() {
  const [initialPrice, initialMacro, initialBlockData] = await Promise.all([
    fetchInitialPrice(),
    fetchInitialMacro(),
    fetchInitialBlocks(),
  ]);

  const initialBlockHeight = initialBlockData.blocks[0]?.height ?? 0;

  return (
    <PageLayout className="!pt-0 !gap-3">
      {/* 시세가 곧 화면인 페이지라 제목 UI 를 두지 않음. 제목 신호만 숨겨서 심음. */}
      <PageTitle srOnly label="Overview" title="비트코인 실시간 시세와 네트워크 현황" />
      <PricePanel initialPrice={initialPrice} />
      <MacroWidgetPanel
        initialMacro={initialMacro}
        initialPrice={initialPrice}
        initialBlockData={initialBlockData}
      />
      <ClientChart />
      <BlockHalvingCard initialBlockHeight={initialBlockHeight} />
    </PageLayout>
  );
}
