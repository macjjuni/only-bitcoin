import { create } from "zustand";
import { persist } from "zustand/middleware";

import {
  type BtcProps,
  ThemeTypes,
  DominanceProps,
  MarketType,
  ExRateProps,
  UpdateKRWProps,
  UpdateUSDProps,
  UpdateDominanceProps,
  FearGreedProps,
  BlockProps,
  ChartData,
  BtcChart,
  MarketChartIntervalType,
} from "@/store/store.interface";

/** 📌 Rules!
 * 1. 설정(ex: 테마)값 업데이트 함수는 변경된 값을 그대로 리턴하도록 작성
 */

interface BearState {
  btc: BtcProps; // BTC 시세 정보
  btcChart: BtcChart;
  setBtcChart: (interval: MarketChartIntervalType, data: ChartData) => void;
  dominance: DominanceProps; // 도미넌스 정보
  market: MarketType; // 메인 시세 단위 => 'KRW' | 'USD' | 'KRW/USD'
  exRate: ExRateProps; // USD/KRW 환율 데이터
  amount: string; // BTC 개수 Input 값
  isCountAnime: boolean; // 가격 변동 애니메이션 효과 여부
  fearGreed: FearGreedProps; // 공포&탐욕 지수
  theme: ThemeTypes;
  isLottiePlay: boolean; // 메인 로티 애니메이션
  blockData: BlockProps; // 블록 생성 정보
  marketChartInterval: MarketChartIntervalType; // 대시보드 차트 인터벌
  updateKRW: (by: UpdateKRWProps) => void;
  updateUSD: (by: UpdateUSDProps) => void;
  updateDominance: (by: UpdateDominanceProps) => void;
  setMarket: (market: MarketType) => MarketType;
  setExRate: (exRate: ExRateProps) => void;
  setAmount: (by: string) => void;
  updateFearGreed: (data: FearGreedProps) => void;
  setTheme: (theme: ThemeTypes) => void;
  setCountAnime: (bool: boolean) => boolean;
  toggleLottie: () => void;
  updateBlock: (blockData: BlockProps) => void; // 블록 생성 정보 업데이트
  setMarketChartInterval: (interval: MarketChartIntervalType) => void; // 대시보드 차트 인터벌
}

const useBearStore = create<BearState>()(
  persist(
    (set) => ({
      btc: { krw: 0, krwDate: "", krwColor: true, usd: 0, usdDate: "", usdColor: true },
      btcChart: {
        1: { date: [], price: [], timeStamp: 0 },
        7: { date: [], price: [], timeStamp: 0 },
        30: { date: [], price: [], timeStamp: 0 },
        365: { date: [], price: [], timeStamp: 0 },
      },
      marketChartInterval: 365,
      setBtcChart: (interval, data) =>
        set((state) => ({
          btcChart: { ...state.btcChart, [interval]: data },
        })),
      theme: "dark",
      market: "KRW/USD",
      setMarket: (market: MarketType) => {
        set({ market });
        return market;
      },
      dominance: { value: "", date: "" },
      fearGreed: { value: "", date: "" },
      exRate: { date: "", provider: "", basePrice: 0 },
      amount: "1",
      isSetting: false,
      isCountAnime: true,
      isLottiePlay: true,
      blockData: {
        height: 0,
        timeStamp: 0,
        updateTimeStamp: 0,
        halvingPercent: 0,
        nextHalving: {
          nextHalvingHeight: 0,
          nextHalvingPredictedDate: 0,
          remainingHeight: 0,
        },
      },
      setAmount: (price) => set(() => ({ amount: price })),
      updateKRW: (krw) => set((state) => ({ btc: { ...state.btc, ...krw } })),
      updateUSD: (usd) => set((state) => ({ btc: { ...state.btc, ...usd } })),
      updateDominance: (dominance) => set(() => ({ dominance })),
      setExRate: (exRate) => set(() => ({ exRate })),
      updateFearGreed: (data) => set(() => ({ fearGreed: data })),
      setTheme: (theme) => set(() => ({ theme })), // deprecated
      setCountAnime: (isCountAnime) => {
        set({ isCountAnime });
        return isCountAnime;
      },
      toggleLottie: () => set((state) => ({ isLottiePlay: !state.isLottiePlay })),
      updateBlock: (blockData) => set(() => ({ blockData })),
      setMarketChartInterval: (marketChartInterval) => set(() => ({ marketChartInterval })),
    }),
    { name: "bear-storage" } // persist key
  )
);

export const bearStore = useBearStore.getState();

export default useBearStore;
