"use client";

import { MacroWidgetPanel, MarketChart, MiningMetricChart, PricePanel, BlockHalvingCard } from "./components";
import { PageLayout } from "@/layouts";
import useStore from "@/shared/stores/store";
// import { KSkeleton } from "kku-ui";
// import dynamic from "next/dynamic";


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
