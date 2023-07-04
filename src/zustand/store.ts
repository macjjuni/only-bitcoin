import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export interface IBtc {
  title: string
  ticker: string
  priceKRW: number
  priceUSD: number
  time: string
}

interface IUpdateUSD {
  priceUSD: number
  time: string
}

interface BearState {
  btc: IBtc
  amount: string
  // theme: 'dark' | 'light'
  setAmount: (by: string) => void
  update: (by: Omit<IBtc, 'priceUSD'>) => void
  updateUSD: (by: IUpdateUSD) => void
}

export const useBearStore = create<BearState>()(
  persist(
    (set) => ({
      btc: {
        title: 'btc',
        ticker: 'KRW-BTC',
        priceKRW: 0,
        priceUSD: 0,
        time: 'no data',
      },
      amount: '1',
      // theme: 'light',
      setAmount: (by) => set(() => ({ amount: by })),
      update: (by) =>
        set((state) => ({
          btc: { ...by, priceUSD: state.btc.priceUSD },
        })),
      updateUSD: (by) =>
        set((state) => ({
          btc: {
            ...state.btc,
            priceUSD: by.priceUSD,
            time: by.time,
          },
        })),
    }),
    {
      name: 'bear-storage', // persist key
    }
  )
)
