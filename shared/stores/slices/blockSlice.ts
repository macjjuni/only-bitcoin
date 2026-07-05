import { StateCreator } from "zustand";
import type { StoreType } from "@/shared/stores/store";


export interface BlockTypes {
  id: string;
  height: number; // 블록 높이
  timestamp: number; // 블록 생성 타임스탬프
  size: number;
  poolName: string;
}

export interface FeesTypes {
  economyFee: number;
  fastestFee: number;
  halfHourFee: number;
  hourFee: number;
  minimumFee: number;
}


export interface BlockSlice {
  blockData: BlockTypes[];
  setBlockData: (blocks: BlockTypes[]) => void;
  fees: FeesTypes;
  setFees: (fees: FeesTypes) => void;
}


export const createBlockSlice: StateCreator<StoreType, [], [], BlockSlice> = (set) => ({
  blockData: [{ id: "", height: 0, timestamp: 0, size: 0, poolName: "-" }],
  setBlockData: (blockData) => set(() => ({ blockData: [...blockData] })),
  fees: { economyFee: 0, fastestFee: 0, halfHourFee: 0, hourFee: 0, minimumFee: 0 },
  setFees: (fees) => set(() => ({ fees })),
});
