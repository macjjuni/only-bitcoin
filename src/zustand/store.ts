import { create } from 'zustand'
import { devtools, persist } from 'zustand/middleware'

interface BearState {
  bears: number
  increase: (by: number) => void
  clear: () => void
}

export const useBearStore = create<BearState>()(
  devtools(
    persist(
      (set) => ({
        bears: 0,
        increase: (by) => set((state) => ({ bears: state.bears + by })),
        clear: () => set(() => ({ bears: 0 })),
      }),
      {
        name: 'bear-storage', // persist key
      }
    )
  )
)
