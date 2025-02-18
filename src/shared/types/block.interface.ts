
interface BlockExtras {
  reward: number;
  coinbaseRaw: string;
  orphans: any[];
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
  feePercentiles: any;
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
