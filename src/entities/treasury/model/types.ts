/** CoinGecko `/companies/public_treasury/bitcoin` 응답의 개별 기업 항목. */
export interface PublicTreasuryCompanyResponse {
  name: string;
  symbol: string;
  country: string;
  total_holdings: number;
  total_entry_value_usd: number;
  total_current_value_usd: number;
  percentage_of_total_supply: number;
}

/** CoinGecko `/companies/public_treasury/bitcoin` 원본 응답. */
export interface PublicTreasuryResponse {
  total_holdings: number;
  total_value_usd: number;
  market_cap_dominance: number;
  companies: PublicTreasuryCompanyResponse[];
}

/**
 * 화면에서 쓰는 기업 보유 현황.
 *
 * 원본 응답의 snake_case 를 camelCase 로 정규화하고, 매번 다시 계산할 필요가 없는
 * 파생 지표(평단가·평가손익·수익률)를 서버에서 미리 채워 둔다.
 */
export interface CompanyTreasuryHolding {
  /** `symbol` 은 `NASDAQ:MSTR` 형태라 거래소가 다르면 같은 티커도 충돌하지 않는다. */
  tickerSymbol: string;
  companyName: string;
  /** ISO 3166-1 alpha-2 국가 코드. */
  countryCode: string;
  totalHoldingsInBtc: number;
  totalEntryValueInUsd: number;
  totalCurrentValueInUsd: number;
  /** 전체 발행량(2,100만 BTC) 대비 비중(%). */
  percentageOfTotalSupply: number;
  /** 매입 총액 ÷ 보유 수량. 매입 데이터가 없으면 0. */
  averageEntryPriceInUsd: number;
  /** 평가 금액 - 매입 금액. */
  unrealizedProfitInUsd: number;
  /** 평가손익률(%). 매입 금액이 0 이면 0. */
  unrealizedProfitRatePercent: number;
}

/** 상장기업 전체 합산 지표. */
export interface PublicTreasurySummary {
  totalHoldingsInBtc: number;
  totalValueInUsd: number;
  /** 비트코인 시가총액 대비 상장기업 보유분 비중(%). */
  marketCapDominancePercent: number;
  totalEntryValueInUsd: number;
  unrealizedProfitInUsd: number;
  unrealizedProfitRatePercent: number;
  companyCount: number;
}

/** 트레저리 페이지가 서버에서 받아 가는 전체 데이터. */
export interface PublicTreasurySnapshot {
  summary: PublicTreasurySummary;
  companies: CompanyTreasuryHolding[];
  /** 스냅샷을 만든 시각(ISO 8601). ISR 캐시가 언제 갱신됐는지 표시하는 데 쓴다. */
  fetchedAt: string;
  /** 외부 API 조회에 실패해 빈 스냅샷을 반환했는지 여부. */
  hasFetchFailed: boolean;
}
