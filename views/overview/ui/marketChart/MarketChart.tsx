"use client";

import { useCallback, useMemo } from "react";
import type { MarketChartIntervalType } from "@/entities/bitcoin";
import { useMarketChartData } from "@/entities/bitcoin/client";
import useOverviewStore from "../../model/overviewStore";
import OverviewChartShell from "../chartShell/OverviewChartShell";
import type { ChartIntervalOption } from "../chartShell/OverviewChartShell.interface";

const marketChartIntervalOptions: ChartIntervalOption<MarketChartIntervalType>[] = [
  { text: "1D", value: "1d" },
  { text: "7D", value: "7d" },
  { text: "1M", value: "1m" },
  { text: "1Y", value: "1y" },
  { text: "5Y", value: "5y" },
  { text: "All", value: "all" },
];

export default function MarketChart() {
  // region [Hooks]
  const marketChartInterval = useOverviewStore((state) => state.marketChartInterval);
  const setMarketChartInterval = useOverviewStore((state) => state.setMarketChartInterval);
  const { marketChartData, isLoading } = useMarketChartData(marketChartInterval);

  const seriesData = useMemo(() => {
    if (!marketChartData?.date?.length) return [];
    return marketChartData.date.map((timestamp, idx) => ({
      x: timestamp,
      y: marketChartData.price[idx],
    }));
  }, [marketChartData]);
  // endregion

  // region [Privates]
  const formatter = useCallback((val: number) => `$${Math.floor(val).toLocaleString()}`, []);
  // endregion

  return (
    <OverviewChartShell
      seriesName="Price"
      seriesData={seriesData}
      isLoading={isLoading}
      formatter={formatter}
      intervalOptions={marketChartIntervalOptions}
      currentInterval={marketChartInterval}
      onChangeInterval={setMarketChartInterval}
      strokeWidth={1.48}
      fillOpacityTo={{ light: 0.6, dark: 0.06 }}
      fillStops={[0, 90]}
      chartHeight={200}
    />
  );
}
