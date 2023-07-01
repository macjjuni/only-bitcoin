import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export interface IBtc {
  title: string
  ticker: string
  price: number
}

interface BearState {
  btc: IBtc
  amount: string
  setAmount: (by: string) => void
  update: (by: IBtc) => void
}

export const useBearStore = create<BearState>()(
  persist(
    (set) => ({
      btc: {
        title: 'btc',
        ticker: 'KRW-BTC',
        price: 0,
      },
      amount: '1',
      setAmount: (by) => set(() => ({ amount: by })),
      update: (by) =>
        set(() => ({
          btc: {
            title: by.title,
            ticker: by.ticker,
            price: by.price,
          },
        })),
    }),
    {
      name: 'bear-storage', // persist key
    }
  )
)
