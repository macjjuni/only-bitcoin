import { StateCreator } from "zustand";
import type { StoreType } from "@/shared/stores/store";


export type UnitType = 'BTC' | 'USD' | 'KRW' | 'SATS';


export interface Btc2FiatSlice {
  btc2Fiat: { btcCount: string; krw: string; usd: string; sats: string; };
  setBtcCount: (btcCount: string) => void;
  setKrw: (krw: string) => void;
  setUsd: (usd: string) => void;
  setSats: (sats: string) => void;
  focusCurrency: UnitType;
  setFocusCurrency: (currency: UnitType) => void;
  premium: number;
  setPremium: (premium: number) => void;
}


export const createBtc2FiatSlice: StateCreator<StoreType, [], [], Btc2FiatSlice> = (set) => ({
  btc2Fiat: { btcCount: "1", krw: "0", usd: "0", sats: "0" },
  setBtcCount: (btcCount) => set((state) => ({ btc2Fiat: { ...state.btc2Fiat, btcCount } })),
  setKrw: (krw) => set((state) => ({ btc2Fiat: { ...state.btc2Fiat, krw } })),
  setUsd: (usd) => set((state) => ({ btc2Fiat: { ...state.btc2Fiat, usd } })),
  setSats: (sats) => set((state) => ({ btc2Fiat: { ...state.btc2Fiat, sats } })),
  focusCurrency: "BTC",
  setFocusCurrency: (focusCurrency) => set(() => ({ focusCurrency })),
  premium: 0,
  setPremium: (premium) => set(() => ({ premium })),
});
