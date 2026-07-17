import type { StateCreator } from "zustand";

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

export interface MempoolInfoTypes {
  txCount: number; // 미확인 트랜잭션 수
  vsize: number; // 대기 중인 트랜잭션 총 vsize(vB)
}

export interface BlockSlice {
  blockData: BlockTypes[];
  setBlockData: (blocks: BlockTypes[]) => void;
  fees: FeesTypes;
  setFees: (fees: FeesTypes) => void;
  mempoolInfo: MempoolInfoTypes;
  setMempoolInfo: (mempoolInfo: MempoolInfoTypes) => void;
}

export const createBlockSlice: StateCreator<BlockSlice> = (set) => ({
  blockData: [{ id: "", height: 0, timestamp: 0, size: 0, poolName: "-" }],
  setBlockData: (blockData) => set(() => ({ blockData: [...blockData] })),
  fees: { economyFee: 0, fastestFee: 0, halfHourFee: 0, hourFee: 0, minimumFee: 0 },
  setFees: (fees) => set(() => ({ fees })),
  mempoolInfo: { txCount: 0, vsize: 0 },
  setMempoolInfo: (mempoolInfo) => set(() => ({ mempoolInfo })),
});
