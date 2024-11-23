import { create } from "zustand";
import { persist } from "zustand/middleware";
import type {
  BtcProps,
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
  updateKRW: (by: UpdateKRWProps) => void;
  updateUSD: (by: UpdateUSDProps) => void;

  btcChart: BtcChart;
  setBtcChart: (interval: MarketChartIntervalType, data: ChartData) => void;

  dominance: DominanceProps; // 도미넌스 정보
  updateDominance: (by: UpdateDominanceProps) => void;

  market: MarketType; // 메인 시세 단위 => 'KRW' | 'USD' | 'KRW/USD'
  setMarket: (market: MarketType) => MarketType;

  theme: ThemeTypes;
  setTheme: (theme: ThemeTypes) => void;

  exRate: ExRateProps; // USD/KRW 환율 데이터
  setExRate: (exRate: ExRateProps) => void;

  amount: string; // BTC 개수 Input 값
  setAmount: (by: string) => void;

  isCountAnime: boolean; // 가격 변동 애니메이션 효과 여부
  setCountAnime: (bool: boolean) => void;

  fearGreed: FearGreedProps; // 공포&탐욕 지수
  updateFearGreed: (data: FearGreedProps) => void;

  isLottiePlay: boolean; // 메인 로티 애니메이션
  toggleLottie: () => void;

  blockData: BlockProps; // 블록 생성 정보
  updateBlock: (blockData: BlockProps) => void; // 블록 생성 정보 업데이트

  marketChartInterval: MarketChartIntervalType; // 대시보드 차트 인터벌
  setMarketChartInterval: (interval: MarketChartIntervalType) => void; // 대시보드 차트 인터벌
}

const useBearStore = create<BearState>()(
  persist(
    (set) => ({
      btc: { krw: 0, krwDate: "", krwColor: true, usd: 0, usdDate: "", usdColor: true, isKrwStatus: false, isUsdStatus: false },
      updateKRW: (krw) => set((state) => ({ btc: { ...state.btc, ...krw } })),
      updateUSD: (usd) => set((state) => ({ btc: { ...state.btc, ...usd } })),

      btcChart: {
        1: { date: [], price: [], timeStamp: 0 },
        7: { date: [], price: [], timeStamp: 0 },
        30: { date: [], price: [], timeStamp: 0 },
        365: { date: [], price: [], timeStamp: 0 }
      },
      setBtcChart: (interval, data) => set((state) => ({ btcChart: { ...state.btcChart, [interval]: data }})),

      dominance: { value: "", date: "" },
      updateDominance: (dominance) => set(() => ({ dominance })),

      market: "KRW/USD",
      setMarket: (market: MarketType) => {
        set({ market });
        return market;
      },

      theme: "dark",
      setTheme: (theme) => set(() => ({ theme })), // deprecated

      exRate: { date: "", provider: "", basePrice: 0 },
      setExRate: (exRate) => set(() => ({ exRate })),

      amount: "1",
      setAmount: (price) => set(() => ({ amount: price })),

      isCountAnime: true,
      setCountAnime: (isCountAnime) => set(() => ({ isCountAnime })),

      fearGreed: { value: "", date: "" },
      updateFearGreed: (data) => set(() => ({ fearGreed: data })),

      isLottiePlay: true,
      toggleLottie: () => set((state) => ({ isLottiePlay: !state.isLottiePlay })),

      blockData: {
        height: 0,
        timeStamp: 0,
        updateTimeStamp: 0,
        halvingPercent: 0,
        nextHalving: {
          nextHalvingHeight: 0,
          nextHalvingPredictedDate: 0,
          remainingHeight: 0
        }
      },
      updateBlock: (blockData) => set(() => ({ blockData })),

      marketChartInterval: 365,
      setMarketChartInterval: (marketChartInterval) => set(() => ({ marketChartInterval }))
    }),
    { name: "bear-storage" } // persist key
  )
);

export const bearStore = useBearStore.getState();

export default useBearStore;
