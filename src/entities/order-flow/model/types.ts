/** 지원하는 거래소 식별자. BTC 현물만 다룬다. */
export type VenueId = "binance" | "coinbase" | "upbit";

/**
 * 거래소 연결 상태.
 *
 * `syncing` 은 소켓은 붙었지만 오더북 기준점(스냅샷)이 아직 없어 지표를 신뢰할 수 없는 구간이다.
 * 통합 압력 계산에는 `live` 만 참여한다.
 */
export type ConnectionStatus = "connecting" | "syncing" | "live" | "stale" | "error";

/** 체결의 공격 방향. 테이커 기준이다. */
export type TradeSide = "buy" | "sell";

/** 체결 규모 등급. 거래소별 최근 체결량 백분위로 결정한다. */
export type TradeMagnitude = "small" | "medium" | "large" | "huge";

/** 호가 한 단계. 가격은 거래소 고유 통화, 수량은 BTC 로 통일한다. */
export interface OrderBookLevel {
  priceInQuote: number;
  sizeInBtc: number;
}

/** 정규화된 체결 한 건. */
export interface TradeTick {
  /** 거래소 원본 체결 식별자. 중복 제거 키로 쓴다. */
  tradeID: string;
  venue: VenueId;
  timestampInMs: number;
  priceInQuote: number;
  sizeInBtc: number;
  aggressorSide: TradeSide;
  magnitude: TradeMagnitude;
}

/** 거래소 한 곳의 파생 지표. 모두 무차원이거나 거래소 고유 통화 기준이다. */
export interface VenueMetrics {
  venue: VenueId;
  status: ConnectionStatus;
  midPriceInQuote: number;
  spreadInQuote: number;
  bestBidPriceInQuote: number;
  bestAskPriceInQuote: number;
  bookImbalance: number;
  tradePressure: number;
  momentum: number;
  venuePressure: number;
  latencyInMs: number;
  buyVolumeInBtc: number;
  sellVolumeInBtc: number;
  lastMessageAtInMs: number;
}

/** 진단 패널에 노출하는 거래소별 누적 카운터. */
export interface VenueDiagnostics {
  reconnectCount: number;
  resyncCount: number;
  sequenceGapCount: number;
  parseErrorCount: number;
}

/** HUD 가 소비하는 저빈도 스냅샷. 초당 4~10 회만 갱신한다. */
export interface OrderFlowSnapshot {
  venues: Record<VenueId, VenueMetrics>;
  diagnostics: Record<VenueId, VenueDiagnostics>;
  /** `live` 거래소들의 venuePressure 평균. 참여 거래소가 없으면 0. */
  aggregatePressure: number;
  /** 통합 계산에 실제로 포함된 거래소 목록. */
  includedVenues: VenueId[];
  tradesPerSecond: number;
  updatedAtInMs: number;
}
