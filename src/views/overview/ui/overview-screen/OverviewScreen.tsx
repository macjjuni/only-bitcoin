import { fetchInitialBitcoinPrice, fetchMacroIndicators } from "@/entities/bitcoin";
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
  const [initialPrice, initialMacro] = await Promise.all([
    fetchInitialBitcoinPrice(),
    fetchMacroIndicators(),
  ]);

  return (
    <PageLayout>
      <PricePanel initialPrice={initialPrice} />
      <MacroWidgetPanel initialMacro={initialMacro} initialPrice={initialPrice} />
      <ClientChart />
      <BlockHalvingCard />
    </PageLayout>
  );
}
