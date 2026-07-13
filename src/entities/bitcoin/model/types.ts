export interface ICurrency {
  ath: number | null;
  ath_change_percentage: number | null;
  ath_date: string | null;
  atl: number | null;
  atl_change_percentage: number | null;
  atl_date: string | null;
  circulating_supply: number | null;
  current_price: number | null;
  fully_diluted_valuation: number | null;
  high_24h: number | null;
  id: string | null;
  image: string | null;
  last_updated: string | null;
  low_24h: number | null;
  market_cap: number;
  market_cap_change_24h: number | null;
  market_cap_change_percentage_24h: number | null;
  market_cap_rank: 1;
  max_supply: number | null;
  name: string | null;
  price_change_24h: number | null;
  price_change_percentage_24h: number | null;
  roi: null;
  symbol: string | null;
  total_supply: number | null;
  total_volume: number | null;
}

export interface FearGreedIndexResponseTypes {
  name: string;
  data: [
    {
      value: string;
      value_classification: string;
      timestamp: string;
      time_until_update: string;
    },
  ];
  metadata: {
    error: null | string;
  };
}

/** 가격 차트 조회 기간 (useMarketChartQuery 파라미터) */
export type MarketChartIntervalType = "1d" | "7d" | "1m" | "1y" | "5y" | "10y" | "all";

/** SSR 초기 시세 (price.server) */
export interface InitialPrice {
  krw: number;
  krwChange24h: string;
  usd: number;
  usdChange24h: string;
}

/** SSR 초기 매크로 지표 (macro.server) */
export interface InitialMacro {
  /** 비트코인 도미넌스(%) */
  dominance: number;
  /** 공포탐욕지수(0~100) */
  fearGreedIndex: number;
  /** USD → KRW 환율 */
  usdExRate: number;
  /** 환율 조회 일자(YYYY-MM-DD). 조회 실패 시 빈 문자열 */
  usdExRateDate: string;
}
