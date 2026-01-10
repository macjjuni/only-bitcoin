"use client";

import { BlockHalvingCard, MacroWidgetPanel, MarketChart, MiningMetricChart, PricePanel } from "./components";
import useStore from "@/shared/stores/store";
import { PageLayout } from "@/layouts";


// const BlockHalvingCard = dynamic(() =>
//     import("@/app/overview/components/blockHalvingCard/BlockHalvingCard"),
//   { ssr: false, loading: () => <KSkeleton className="w-full h-[132px]" /> }
// );
//
// const PricePanel = dynamic(() =>
//     import("@/app/overview/components/pricePanel/PricePanel"),
//   { ssr: false, loading: () => <KSkeleton className="w-full h-[74px]" /> }
// );

export default function OverviewPage() {

  // region [Hooks]
  const overviewChart = useStore(store => store.overviewChart);
  // endregion

  return (
    <PageLayout>
      <PricePanel />
      <MacroWidgetPanel />
      {overviewChart === "price" && <MarketChart />}
      {["hashrate", "difficulty"].includes(overviewChart) && <MiningMetricChart />}
      <BlockHalvingCard />
    </PageLayout>
  );
}
