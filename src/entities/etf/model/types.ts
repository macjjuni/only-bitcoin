/** Xoomar ETF 흐름 API의 개별 일별 행. */
export interface XoomarEtfFlowRowResponse {
  id?: number;
  date: string;
  ticker: string;
  issuer: string;
  asset: string;
  holdings: string | null;
  flowUsd: string | null;
  aumUsd: string | null;
}

/** Xoomar ETF 흐름 API 응답 봉투. */
export interface XoomarEtfFlowResponse {
  data: XoomarEtfFlowRowResponse[];
  updatedAt: string;
  source: string;
  docs: string;
}

/** 개발 서버 시작 전에 생성하는 비트코인 ETF 전체 이력 아카이브. */
export interface BitcoinEtfFlowArchive {
  generatedAt: string;
  latestSourceDate: string;
  sourceUpdatedAt: string;
  rows: XoomarEtfFlowRowResponse[];
}

/** 한 기준일의 ETF별 화면용 데이터. */
export interface BitcoinEtfFundSnapshot {
  date: string;
  ticker: string;
  issuer: string;
  holdingsInBtc: number | null;
  estimatedFlowInUsd: number | null;
  estimatedAumInUsd: number | null;
  /** 비정상적으로 큰 추정 흐름이라 합계에서 제외됐는지 여부. */
  isEstimatedFlowExcluded: boolean;
}

/** 차트에서 사용하는 완전 집계일별 합산 흐름. */
export interface BitcoinEtfDailyFlow {
  date: string;
  estimatedNetFlowInUsd: number;
  reportedFundCount: number;
  validFlowFundCount: number;
  excludedFlowCount: number;
}

/** ETF 페이지 최상단 합산 지표. */
export interface BitcoinEtfSummary {
  referenceDate: string;
  latestSourceDate: string;
  trackedFundCount: number;
  reportedFundCount: number;
  validFlowFundCount: number;
  excludedFlowCount: number;
  estimatedNetFlowInUsd: number;
  totalHoldingsInBtc: number;
  estimatedAumInUsd: number;
  isFullCoverage: boolean;
}

/** ETF 페이지가 서버에서 받아 가는 정규화된 전체 데이터. */
export interface BitcoinEtfSnapshot {
  summary: BitcoinEtfSummary;
  dailyFlows: BitcoinEtfDailyFlow[];
  funds: BitcoinEtfFundSnapshot[];
  sourceUpdatedAt: string;
  hasFetchFailed: boolean;
}
