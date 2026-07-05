import { StateCreator } from "zustand";
import type { StoreType } from "@/shared/stores/store";


export type OverviewChartType = 'hashrate' | 'difficulty' | 'price';
export type MarketChartIntervalType = '1d' | '7d' | '1m' | '1y' | '5y' | 'all';
export type MiningMetricChartIntervalType = '3m' | '6m' | '1y' | '2y' | '3y' | 'all';


export interface ChartSlice {
  // 대시보드 가격 차트
  overviewChart: OverviewChartType;
  setOverviewChart: (chart: OverviewChartType) => void;
  marketChartInterval: MarketChartIntervalType;
  setMarketChartInterval: (interval: MarketChartIntervalType) => void;
  // 대시보드 해시레이트 차트
  miningMetricChartInterval: MiningMetricChartIntervalType;
  setMiningMetricChartInterval: (interval: MiningMetricChartIntervalType) => void;
}


export const createChartSlice: StateCreator<StoreType, [], [], ChartSlice> = (set) => ({
  overviewChart: "price",
  setOverviewChart: (overviewChart) => set(() => ({ overviewChart })),
  marketChartInterval: '5y',
  setMarketChartInterval: (marketChartInterval) => set(() => ({ marketChartInterval })),
  miningMetricChartInterval: "all",
  setMiningMetricChartInterval: (miningMetricChartInterval) => set(() => ({ miningMetricChartInterval })),
});
