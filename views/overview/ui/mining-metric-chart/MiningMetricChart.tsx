"use client";

import { useCallback, useMemo } from "react";
import type { MiningMetricChartIntervalType } from "@/entities/bitcoin";
import { useBitcoinStore } from "@/entities/bitcoin";
import { useMiningMetricChartData } from "@/entities/block/client";
import { formatDifficulty, formatHashrate } from "@/shared/utils/number";
import OverviewChartShell from "../chartShell/OverviewChartShell";
import type { ChartIntervalOption } from "../chartShell/OverviewChartShell.interface";
import MiningMetricHeader from "./MiningMetricHeader";

/*
 * 해시레이트 모든 차트는 데이터 크기가 많아 시간기반 균일 샘플링으로 최적화(64%) 했으나,
 * 시간이 지날수록 데이터가 계속 늘어나므로 최적화 양을 늘리거나 알고리즘 변화가 필요함.
 *  */

const miningMetricChartIntervalOptions: ChartIntervalOption<MiningMetricChartIntervalType>[] = [
  { text: "3M", value: "3m" },
  { text: "1Y", value: "1y" },
  { text: "3Y", value: "3y" },
  { text: "All", value: "all" },
];

export default function MiningMetricChart() {
  // region [Hooks]
  const overviewChart = useBitcoinStore((store) => store.overviewChart);
  const miningMetricChartInterval = useBitcoinStore((state) => state.miningMetricChartInterval);
  const setHashrateChartInterval = useBitcoinStore((state) => state.setMiningMetricChartInterval);
  const { data, isLoading } = useMiningMetricChartData(miningMetricChartInterval);

  /**
   * 차트 타입에 따른 데이터 반환
   */
  const chartRowData = useMemo(() => {
    if (!data) return { value: [] as number[], date: [] as number[] };
    if (overviewChart === "hashrate") return data.hashrates;
    if (overviewChart === "difficulty") return data.difficulty;

    console.error("Invalid overview chart type:", overviewChart);
    return { value: [] as number[], date: [] as number[] };
  }, [overviewChart, data]);

  const seriesData = useMemo(() => {
    if (!chartRowData.date?.length) return [];
    // mempool.space 타임스탬프는 초 단위 → ApexCharts datetime은 ms 단위
    return chartRowData.date.map((timestamp, idx) => ({
      x: timestamp * 1000,
      y: chartRowData.value[idx],
    }));
  }, [chartRowData]);

  const maxValue = useMemo(() => {
    const values = chartRowData.value;
    if (!values.length) return 0;
    return values.reduce((max, val) => (val > max ? val : max), values[0]);
  }, [chartRowData]);

  /**
   * 현재값 대비 최대값의 변화율 계산
   */
  const percentage = useMemo(() => {
    if (!data) return 0;
    const factor = 10 ** 2;
    const targetCurrentValue =
      overviewChart === "hashrate" ? data.currentHashrate : data.currentDifficulty;
    const percentValue = ((targetCurrentValue - maxValue) / Math.abs(targetCurrentValue)) * 100;
    return Math.floor(percentValue * factor) / factor;
  }, [data, maxValue, overviewChart]);

  const allTimeHighValue = useMemo(() => {
    if (!data) return "";
    if (overviewChart === "hashrate")
      return `Hashrate: ${formatHashrate(data.currentHashrate || 0)}`;
    if (overviewChart === "difficulty")
      return `Difficulty: ${formatDifficulty(data.currentDifficulty || 0)}`;
    return "";
  }, [data, overviewChart]);
  // endregion

  // region [Privates]
  const formatter = useCallback(
    (val: number) => (overviewChart === "hashrate" ? formatHashrate(val) : formatDifficulty(val)),
    [overviewChart],
  );
  // endregion

  return (
    <OverviewChartShell
      seriesName={overviewChart === "hashrate" ? "Hashrate" : "Difficulty"}
      seriesData={seriesData}
      isLoading={isLoading}
      formatter={formatter}
      intervalOptions={miningMetricChartIntervalOptions}
      currentInterval={miningMetricChartInterval}
      onChangeInterval={setHashrateChartInterval}
      strokeWidth={1.8}
      fillOpacityTo={{ light: 0.9, dark: 0.06 }}
      fillStops={[0, 80]}
      chartHeight={185}
      loadingClassName="flex justify-center items-center aspect-[2/1]"
      topSlot={
        <MiningMetricHeader
          hasData={!!data}
          allTimeHighValue={allTimeHighValue}
          percentage={percentage}
        />
      }
    />
  );
}
