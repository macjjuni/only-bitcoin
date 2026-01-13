"use client";

import { memo } from "react";
import { MarketChart, MiningMetricChart } from "@/components/features/overview";
import useStore from "@/shared/stores/store";
const ClientChart = () => {

  // region [Hooks]
  const overviewChart = useStore(store => store.overviewChart);
  // endregion

  return (
    <>
      {overviewChart === "price" && <MarketChart />}
      {["hashrate", "difficulty"].includes(overviewChart) && <MiningMetricChart />}
    </>
  );
};

const MemoizedClientChart = memo(ClientChart);
MemoizedClientChart.displayName = "ClientChart";

export default MemoizedClientChart;