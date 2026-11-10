/** CoinGecko `/coins/markets` 응답 중 쓰는 필드만. */
export interface CoinGeckoMarketResponseItem {
  id: string;
  symbol: string;
  name: string;
  current_price: number | null;
  market_cap: number | null;
  market_cap_rank: number | null;
  price_change_percentage_24h: number | null;
}

/** CoinGecko `/global` 응답 중 쓰는 필드만. */
export interface CoinGeckoGlobalMarketResponse {
  data: {
    total_market_cap: Record<string, number>;
    /** 코인별 시총 점유율(%). `btc` 가 공식 도미넌스. */
    market_cap_percentage?: Record<string, number>;
  };
}

export interface CoinMarketItem {
  id: string;
  rank: number;
  name: string;
  /** 대문자 티커. */
  symbol: string;
  marketCapInUsd: number;
  priceInUsd: number;
  dailyChangePercent: number | null;
  isStablecoin: boolean;
}

export interface CoinMarketSnapshot {
  /** 시총 내림차순 상위 코인. */
  coins: CoinMarketItem[];
  /** 전체 암호화폐 시가총액. */
  totalMarketCapInUsd: number;
  /** 상위 코인을 뺀 나머지 전체. 시점 차이로 음수가 나오면 0. */
  othersMarketCapInUsd: number;
  /**
   * CoinGecko 공식 비트코인 도미넌스(%). 개요 화면과 같은 값.
   * 목록 시총 ÷ 전체 시총으로 직접 나눈 값과는 집계 기준이 달라 0.2%p 쯤 차이 남.
   */
  bitcoinDominancePercent: number;
  fetchedAt: string;
  hasFetchFailed: boolean;
}
