import type { StateCreator } from "zustand";

export interface BlockTypes {
  id: string;
  height: number; // 블록 높이
  timestamp: number; // 블록 생성 타임스탬프
  size: number;
  poolName: string;
  difficulty: number; // 채굴 난이도. persist 된 구버전 캐시에는 없을 수 있음.
  txCount?: number; // 블록에 담긴 거래 수. 구버전 캐시에는 없음.
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
  /** mempool.space 소켓 연결 여부. 전광판 네트워크판 LIVE 배지가 이 값을 씀. */
  isMempoolConnected: boolean;
  setIsMempoolConnected: (isMempoolConnected: boolean) => void;
  fees: FeesTypes;
  setFees: (fees: FeesTypes) => void;
  mempoolInfo: MempoolInfoTypes;
  setMempoolInfo: (mempoolInfo: MempoolInfoTypes) => void;
}

export const createBlockSlice: StateCreator<BlockSlice> = (set) => ({
  blockData: [{ id: "", height: 0, timestamp: 0, size: 0, poolName: "-", difficulty: 0 }],
  setBlockData: (blockData) => set(() => ({ blockData: [...blockData] })),
  isMempoolConnected: false,
  setIsMempoolConnected: (isMempoolConnected) => set(() => ({ isMempoolConnected })),
  fees: { economyFee: 0, fastestFee: 0, halfHourFee: 0, hourFee: 0, minimumFee: 0 },
  setFees: (fees) => set(() => ({ fees })),
  mempoolInfo: { txCount: 0, vsize: 0 },
  setMempoolInfo: (mempoolInfo) => set(() => ({ mempoolInfo })),
});
