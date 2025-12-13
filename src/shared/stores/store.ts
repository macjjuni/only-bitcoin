import { create } from "zustand";
import { persist } from "zustand/middleware";
import { StoreType } from "@/shared/stores/store.interface";


const useStore = create<StoreType>()(
  persist(
    (set) => ({

      // region [Theme]
      theme: "light",
      setTheme: (theme) => set((store) => ({ ...store, theme })),
      // endregion

      // region [비트코인 실시간 가격]
      bitcoinPrice: {
        krw: 0,
        krwChange24h: "0",
        krwUpdateTimestamp: 0,
        isKrwConnected: false,
        usd: 0,
        usdChange24h: "0",
        usdUpdateTimestamp: 0,
        isUsdConnected: false
      },
      setBitcoinKrwPrice: (krw) => set(({ bitcoinPrice }) => ({
        bitcoinPrice: { ...bitcoinPrice, ...krw }
      })),
      setBitcoinUsdPrice: (usd) => set(({ bitcoinPrice }) => ({
        bitcoinPrice: { ...bitcoinPrice, ...usd }
      })),
      krwMarket: "BITHUMB",
      setKrwMarket: (krwMarket) => set((store) => ({ ...store, krwMarket })),
      reconnectUpbit: () => {},
      reconnectBithumb: () => {},
      reconnectBinance: () => {},
      reconnectCoinbase: () => {},
      setReconnectUpbit: (reconnectUpbit) => set((store) => ({ ...store, reconnectUpbit })),
      setReconnectBithumb: (reconnectBithumb) => set((store) => ({ ...store, reconnectBithumb })),
      setReconnectBinance: (reconnectBinance) => set((store) => ({ ...store, reconnectBinance })),
      setReconnectCoinbase: (reconnectCoinbase) => set((store) => ({ ...store, reconnectCoinbase })),
      // endregion


      // region [대시보드 메크로 순서]
      macroSequence: [1, 2, 3, 4],
      setMacroSequence: (macroSequence) => set((store) => ({ ...store, macroSequence })),
      // endregion


      // region [대시보드 차트]
      overviewChart: "price",
      setOverviewChart: ((overviewChart) => set((store) => ({ ...store, overviewChart }))),
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
      setMarketChartData: (interval, data) => set((store) => ({
        marketChartData: { ...store.marketChartData, [interval]: data }
      })),
      miningMetricChartInterval: "all",
      setMiningMetricChartInterval: ((miningMetricChartInterval) => set((store) =>
        ({ ...store, miningMetricChartInterval })
      )),
      // endregion


      // region [환율 데이터]

      exRate: { value: 0, date: "" },
      setExRate: (exRate) => set(() => ({ exRate })),

      // endregion


      // region [블록 데이터]

      blockData: [{ id: "", height: 0, timestamp: 0, size: 0, poolName: "-" }],
      setBlockData: (blockData) => set(() => ({ blockData: [...blockData] })),
      fees: { economyFee: 0, fastestFee: 0, halfHourFee: 0, hourFee: 0, minimumFee: 0 },
      setFees: (fees) => set(() => ({ fees })),

      // endregion


      // region [BTC2Fiat]

      btc2Fiat: { btcCount: "1", krw: "0", usd: "0", sats: "0" },
      setBtcCount: (btcCount) => set((state) => ({ btc2Fiat: { ...state.btc2Fiat, btcCount } })),
      setKrw: (krw) => set((state) => ({ btc2Fiat: { ...state.btc2Fiat, krw } })),
      setUsd: (usd) => set((state) => ({ btc2Fiat: { ...state.btc2Fiat, usd } })),
      setSats: (sats) => set((state) => ({ btc2Fiat: { ...state.btc2Fiat, sats } })),
      focusCurrency: "BTC",
      setFocusCurrency: (focusCurrency) => set(() => ({ focusCurrency })),
      premium: 0,
      setPremium: (premium: number) => set(() => ({ premium })),

      // endregion


      // region [즐겨찾기]

      setting: {
        initialPath: "/overview",
        currency: "KRW/USD",
        isUsdtStandard: false,
        isCountUp: true,
        isBackgroundImg: false,
        deferredPrompt: null
      },
      setInitialPath: (path) => set((state) => ({
        setting: { ...state.setting, initialPath: path }
      })),
      setCurrency: (currency) => set((state) => {
        // BTC2Fiat 페이지 설정 충돌 방지
        const isNotIncludeCurrency = currency.includes(state.focusCurrency);
        const focusCurrency = !isNotIncludeCurrency ? "BTC" : state.focusCurrency;

        return { setting: { ...state.setting, currency }, focusCurrency };
      }),
      setUsdtStandard: (isUsdtStandard) => set((state) => ({
        setting: { ...state.setting, isUsdtStandard }
      })),
      setIsCountUp: (isCountUp) => set((state) => ({
        setting: { ...state.setting, isCountUp }
      })),
      setIsBackgroundImg: (isBackgroundImg) => set((state) => ({
        setting: { ...state.setting, isBackgroundImg }
      })),
      setDeferredPrompt: (deferredPrompt) => set((state) => ({
        setting: { ...state.setting, deferredPrompt }
      }))

      // endregion
    }),
    { name: "only-bitcoin" } // persist key
  )
);


export default useStore;
