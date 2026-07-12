import type { StateCreator } from "zustand";

// 환율 정보
export interface ExRateTypes {
  value: number;
  date: string;
}

export interface ExRateSlice {
  exRate: ExRateTypes; // USD/KRW 환율 데이터
  setExRate: (exRate: ExRateTypes) => void;
}

export const createExRateSlice: StateCreator<ExRateSlice> = (set) => ({
  exRate: { value: 0, date: "" },
  setExRate: (exRate) => set(() => ({ exRate })),
});
