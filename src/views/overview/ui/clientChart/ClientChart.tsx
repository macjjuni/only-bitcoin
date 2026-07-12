"use client";

import { memo } from "react";
import useOverviewStore from "../../model/overviewStore";
import MarketChart from "../marketChart/MarketChart";
import MiningMetricChart from "../mining-metric-chart/MiningMetricChart";

const ClientChart = () => {
  // region [Hooks]
  const overviewChart = useOverviewStore((store) => store.overviewChart);
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
