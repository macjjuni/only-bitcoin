import { create } from 'zustand'
import { persist } from 'zustand/middleware'

import { type IBtc, IDominance, MarketType, IExRate, IUpdateKRW, IUpdateUSD, IUpdateDominance, IDropDown, IfearGreed } from '@/zustand/type'

interface BearState {
  btc: IBtc // BTC 시세 정보
  dominance: IDominance
  market: MarketType
  exRate: IExRate // USD/KRW 환율 데이터
  dropDown: IDropDown
  amount: string // BTC 개수 Input 값
  isKimchi: boolean // 김치 프리미엄 표시 여부
  isEcoSystem: boolean // 비트코인 생태계 표시 여부
  fearGreed: IfearGreed
  theme: 'dark' | 'light'
  updateKRW: (by: IUpdateKRW) => void
  updateUSD: (by: IUpdateUSD) => void
  updateDoimnance: (by: IUpdateDominance) => void
  setMarket: (market: MarketType) => void
  setExRate: (exRate: IExRate) => void
  setDropDown: (bool: { [index: string]: boolean }) => void
  setAmount: (by: string) => void
  toggleKimchi: (flag: boolean) => void
  toggleEco: (flag: boolean) => void
  updateFearGreed: (data: IfearGreed) => void
  toggleTheme: () => void
}

export const useBearStore = create<BearState>()(
  persist(
    (set) => ({
      theme: 'dark',
      market: 'KRW/USD',
      setMarket: (market: MarketType) => set(() => ({ market })),
      btc: {
        krw: 0,
        krwDate: '',
        krwColor: true,
        usd: 0,
        usdDate: '',
        usdColor: true,
      },
      dominance: {
        value: '',
        date: '',
      },
      fearGreed: {
        value: '',
        date: '',
      },
      exRate: {
        date: '',
        provider: '',
        basePrice: 0,
      },
      dropDown: {
        btcKrw: true,
      },
      amount: '1',
      isKimchi: true,
      isEcoSystem: false,
      isSetting: false,
      setAmount: (price) => set(() => ({ amount: price })),
      updateKRW: (krw) =>
        set((state) => ({
          btc: { ...state.btc, ...krw },
        })),
      updateUSD: (usd) =>
        set((state) => ({
          btc: { ...state.btc, ...usd },
        })),
      updateDoimnance: (dominance) =>
        set(() => ({
          dominance,
        })),
      setDropDown: (bool) => set(() => ({ dropDown: { ...bool } })), // 확정성 필요
      toggleKimchi: (flag) => set(() => ({ isKimchi: flag })),
      toggleEco: (flag) => set(() => ({ isEcoSystem: flag })),
      setExRate: (exRate) => set(() => ({ exRate })),
      updateFearGreed: (data) => set(() => ({ fearGreed: data })),
      toggleTheme: () => set((state) => ({ theme: state.theme === 'light' ? 'dark' : 'light' })),
    }),
    { name: 'bear-storage' } // persist key
  )
)
