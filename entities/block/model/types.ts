interface BlockExtras {
  reward: number;
  coinbaseRaw: string;
  orphans: unknown[];
  medianFee: number;
  feeRange: number[];
  totalFees: number;
  avgFee: number;
  avgFeeRate: number;
  utxoSetChange: number;
  avgTxSize: number;
  totalInputs: number;
  totalOutputs: number;
  totalOutputAmt: number;
  segwitTotalTxs: number;
  segwitTotalSize: number;
  segwitTotalWeight: number;
  feePercentiles: number[] | null;
  virtualSize: number;
  coinbaseAddress: string;
  coinbaseAddresses: string[];
  coinbaseSignature: string;
  coinbaseSignatureAscii: string;
  header: string;
  utxoSetSize: number | null;
  totalInputAmt: number | null;
  pool: {
    id: number;
    name: string;
    slug: string;
    minerNames: string[] | null;
  };
  matchRate: number;
  expectedFees: number;
  expectedWeight: number;
  similarity: number;
}

export interface MemPoolBlockTypes {
  id: string;
  height: number;
  version: number;
  timestamp: number;
  bits: number;
  nonce: number;
  difficulty: number;
  merkle_root: string;
  tx_count: number;
  size: number;
  weight: number;
  previousblockhash: string;
  mediantime: number;
  stale: boolean;
  extras: BlockExtras;
}

export interface DifficultyVO {
  adjustment: number;
  difficulty: number;
  height: number;
  time: number;
}

export interface HashrateVO {
  avgHashrate: number;
  timestamp: number;
}

export interface HashrateChartResponseData {
  currentDifficulty: number;
  currentHashrate: number;
  difficulty: DifficultyVO[];
  hashrates: HashrateVO[];
}

export interface HashrateChartFormattedData {
  currentDifficulty: number;
  currentHashrate: number;
  hashrates: {
    value: number[];
    date: number[];
  };
  difficulty: {
    value: number[];
    date: number[];
  };
}

/** 해시레이트/난이도 차트 조회 기간 (useMiningMetricChartDataQuery 파라미터) */
export type MiningMetricChartIntervalType = "3m" | "6m" | "1y" | "2y" | "3y" | "all";
