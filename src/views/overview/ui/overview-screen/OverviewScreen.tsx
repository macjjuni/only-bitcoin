import { fetchInitialMacro, fetchInitialPrice } from "@/entities/bitcoin/server";
import { fetchInitialBlocks } from "@/entities/block/server";
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
    <PageLayout>
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
