/** CoinGecko `/global` 응답 타입 */
export interface CoinGeckoGlobalResponse {
  data: { market_cap_percentage: Record<string, number> };
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
export type MarketChartIntervalType =
  | "1d"
  | "3d"
  | "7d"
  | "1m"
  | "3m"
  | "6m"
  | "1y"
  | "3y"
  | "5y"
  | "10y"
  | "all";

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
