"use client";

import { memo } from "react";
import useStore from "@/shared/stores/store";
import MarketChart from "../marketChart/MarketChart";
import MiningMetricChart from "../miningMetricChart/MiningMetricChart";

const ClientChart = () => {
  // region [Hooks]
  const overviewChart = useStore((store) => store.overviewChart);
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
