export interface RankedAsset {
  rank: number;
  name: string;
  ticker: string;
  marketCapInUsd: number;
  priceInUsd: number;
  dailyChangePercent: number | null;
  country: string | null;
  logoUrl: string | null;
}

export interface AssetRankingSnapshot {
  assets: RankedAsset[];
  /** 정상 수집·검증을 완료한 시각. 원본 시세의 갱신 시각과는 다르다. */
  fetchedAt: string;
}
