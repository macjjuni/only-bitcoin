import { StateCreator } from "zustand";
import type { StoreType } from "@/shared/stores/store";


// 환율 정보
export interface ExRateTypes {
  value: number;
  date: string;
}


export interface ExRateSlice {
  exRate: ExRateTypes; // USD/KRW 환율 데이터
  setExRate: (exRate: ExRateTypes) => void;
}


export const createExRateSlice: StateCreator<StoreType, [], [], ExRateSlice> = (set) => ({
  exRate: { value: 0, date: "" },
  setExRate: (exRate) => set(() => ({ exRate })),
});
