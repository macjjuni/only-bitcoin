import { create } from "zustand";
import { persist } from "zustand/middleware";
import { StoreType } from "@/shared/stores/store.interface";


const useStore = create<StoreType>()(
  persist(
    (set) => ({

      // region [비트코인 실시간 가격]

      bitcoinPrice: {
        krw: 0,
        krwChange24h: '0',
        krwUpdateTimestamp: 0,
        isKrwConnected: false,
        usd: 0,
        usdChange24h: '0',
        usdUpdateTimestamp: 0,
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


      // region [블록 데이터]

      blockData: [{ id: "", height: 0, timestamp: 0, size: 0, poolName: "-" }],
      setBlockData: (blockData) => set(() => ({ blockData: [...blockData] })),
      fees: { economyFee: 0, fastestFee: 0, halfHourFee: 0, hourFee: 0, minimumFee: 0 },
      setFees: (fees) => set(() => ({ fees })),

      // endregion


      // region [즐겨찾기]

      setting: {
        initialPath: "/overview",
        currency: "KRW/USD",
        isUsdtStandard: false,
        isCountUp: true,
        isBackgroundImg: true,
      },
      setInitialPath: (path) => set((state) => ({
        setting: { ...state.setting, initialPath: path }
      })),
      setCurrency: (currency) => set((state) => ({
        setting: { ...state.setting, currency }
      })),
      setUsdtStandard: (isUsdtStandard) => set((state) => ({
        setting: { ...state.setting, isUsdtStandard }
      })),
      setIsCountUp: (isCountUp) => set((state) => ({
        setting: { ...state.setting, isCountUp }
      })),
      setIsBackgroundImg: (isBackgroundImg) => set((state) => ({
        setting: { ...state.setting, isBackgroundImg }
      })),

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
