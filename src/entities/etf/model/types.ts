/** TFTC `data.json` 의 한 거래일 행 중 쓰는 필드만. */
export interface TftcEtfFlowDayResponse {
  date: string;
  /** 전체 순유입(USD). ETF별 값의 합이고, 내역이 없으면 원 집계값. */
  netFlowUsd: number | null;
  /** 전체 운용자산(USD). 2025-05 이전은 null. */
  totalNetAssetsUsd?: number | null;
  /** 그날 21:00 UTC 무렵의 BTC 가격. */
  btcCloseUsd?: number | null;
  /** 티커별 순유입(USD). 휴장일이나 내역이 없는 날은 비어 있음. */
  perEtfUsd?: Record<string, number | null> | null;
}

/** TFTC `data.json` 응답 중 쓰는 필드만. */
export interface TftcEtfFlowResponse {
  days: TftcEtfFlowDayResponse[];
  /** 마지막으로 반영된 거래일( YYYY-MM-DD ). */
  updatedThrough?: string;
  /** 파일이 마지막으로 갱신된 시각( ISO ). */
  dateModified?: string;
}

/** 정규화한 한 거래일. */
export interface BitcoinEtfDailyFlow {
  date: string;
  netFlowInUsd: number;
  totalNetAssetsInUsd: number | null;
  bitcoinCloseInUsd: number | null;
  /** 티커별 순유입. 내역이 없는 날은 빈 객체. */
  fundFlowsInUsd: Record<string, number>;
}

/** ETF 화면이 서버에서 받아 가는 정규화된 전체 데이터. */
export interface BitcoinEtfSnapshot {
  /** 날짜 오름차순. 휴장일은 빠져 있음. */
  dailyFlows: BitcoinEtfDailyFlow[];
  /** 원천 파일이 갱신된 시각( ISO ). 모르면 빈 문자열. */
  sourceUpdatedAt: string;
  hasFetchFailed: boolean;
}
