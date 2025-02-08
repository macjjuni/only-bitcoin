import { create } from "zustand";
import { persist } from "zustand/middleware";
import { MarketType, StoreType } from "@/store/store.interface";


const useBearStore = create<StoreType>()(
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
      setMarketChartInterval: (marketChartInterval) => set(() => ({ marketChartInterval })),

      isUsdtRateEnabled: false,
      setUsdtRateEnabled: (isUsdtRateEnabled) => set(() => ({isUsdtRateEnabled})),
    }),
    { name: "bear-storage" } // persist key
  )
);

export const bearStore = useBearStore.getState();

export default useBearStore;
