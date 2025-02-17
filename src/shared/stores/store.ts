import { create } from "zustand";
import { persist } from "zustand/middleware";
import { StoreType } from "@/shared/stores/store.interface";


const useStore = create<StoreType>()(
  persist(
    (set) => ({

      // region [비트코인 가격 정보]

      bitcoinPrice: {
        krw: 0,
        krwUpdateTimestamp: 0,
        isKrwEnabled: true,
        isKrwConnected: false,
        usd: 0,
        usdUpdateTimestamp: 0,
        isUsdEnabled: true,
        isUsdConnected: false
      },
      setBitcoinKrwPrice: (krw) => set(({ bitcoinPrice }) => ({
        bitcoinPrice: { ...bitcoinPrice, ...krw }
      })),
      setBitcoinUsdPrice: (usd) => set(({ bitcoinPrice }) => ({
        bitcoinPrice: { ...bitcoinPrice, ...usd }
      })),

      // endregion


      // region [대시보드 차트]

      marketChartInterval: 365,
      setMarketChartInterval: ((interval) => set(() => (
        { ...{ marketChartInterval: interval } }
      ))),
      marketChartData: {
        1: { date: [], price: [], timeStamp: 0 },
        7: { date: [], price: [], timeStamp: 0 },
        30: { date: [], price: [], timeStamp: 0 },
        365: { date: [], price: [], timeStamp: 0 }
      },
      setMarketChartData: (interval, data) => set((state) => ({
        marketChartData: { ...state.marketChartData, [interval]: data }
      })),

      // endregion


      // region [도미넌스]

      dominance: { value: 0, timestamp: 0 },
      setDominance: (dominance) => set(() => ({
        dominance
      })),

      // endregion


      // region [환율 데이터]

      exRate: { value: 0, date: "" },
      setExRate: (exRate) => set(() => ({ exRate })),

      // endregion


      // region [공포탐욕지수]

      fearGreed: { value: 0, timestamp: 0 },
      setFearGreed: (fearGreed) => set(() => ({ fearGreed })),

      // endregion


      // region []

      blockData: {
        height: 0,
        timestamp: 0,
        halvingPercent: 0,
        nextHalving: {
          nextHalvingHeight: 0,
          nextHalvingPredictedDate: '',
          remainingHeight: 0
        }
      },
      setBlockData: (blockData) => set(() => ({ blockData })),

      // endregion


      // market: "KRW/USD",
      // setMarket: (market: MarketType) => {
      //   set({ market });
      //   return market;
      // },
      //
      // theme: "dark",
      // setTheme: (theme) => set(() => ({ theme })), // deprecated
      //
      //
      // amount: "1",
      // setAmount: (price) => set(() => ({ amount: price })),
      //
      // isCountAnime: true,
      // setCountAnime: (isCountAnime) => set(() => ({ isCountAnime })),
      //
      //
      // isLottiePlay: true,
      // toggleLottie: () => set((state) => ({ isLottiePlay: !state.isLottiePlay })),
      //
      //
      // marketChartInterval: 365,
      // setMarketChartInterval: (marketChartInterval) => set(() => ({ marketChartInterval })),
      //
      // isUsdtRateEnabled: false,
      // setUsdtRateEnabled: (isUsdtRateEnabled) => set(() => ({isUsdtRateEnabled})),
    }),
    { name: "only-bitcoin" } // persist key
  )
);


export default useStore;
