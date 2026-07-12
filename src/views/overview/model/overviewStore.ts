import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { MarketChartIntervalType } from "@/entities/bitcoin";
import type { MiningMetricChartIntervalType } from "@/entities/block";
import { migrateLegacyStore } from "@/shared/stores/legacyMigration";
import { OVERVIEW_PERSIST_KEY } from "@/shared/stores/persistKeys";

/** 대시보드에서 어떤 차트를 보여줄지 */
export type OverviewChartType = "hashrate" | "difficulty" | "price";

/**
 * overview 페이지의 화면 상태.
 * 차트 선택 / 기간 선택 / 위젯 배치 순서는 비트코인·블록 도메인 개념이 아니라
 * 이 화면의 상태다. 조회 기간 타입만 각 엔티티(API 파라미터)에서 가져온다.
 */
export interface OverviewState {
  overviewChart: OverviewChartType;
  setOverviewChart: (chart: OverviewChartType) => void;
  marketChartInterval: MarketChartIntervalType;
  setMarketChartInterval: (interval: MarketChartIntervalType) => void;
  miningMetricChartInterval: MiningMetricChartIntervalType;
  setMiningMetricChartInterval: (interval: MiningMetricChartIntervalType) => void;
  macroSequence: number[];
  setMacroSequence: (macroSequence: number[]) => void;
}

// 스토어가 하이드레이트되기 전에 구버전 값을 이관한다. (제거 예정)
migrateLegacyStore();

const useOverviewStore = create<OverviewState>()(
  persist(
    (set) => ({
      overviewChart: "price",
      setOverviewChart: (overviewChart) => set(() => ({ overviewChart })),
      marketChartInterval: "5y",
      setMarketChartInterval: (marketChartInterval) => set(() => ({ marketChartInterval })),
      miningMetricChartInterval: "all",
      setMiningMetricChartInterval: (miningMetricChartInterval) =>
        set(() => ({ miningMetricChartInterval })),
      macroSequence: [1, 2, 3, 4],
      setMacroSequence: (macroSequence) => set(() => ({ macroSequence })),
    }),
    { name: OVERVIEW_PERSIST_KEY },
  ),
);

export default useOverviewStore;
