import { UNKNOWN_LATENCY_IN_MS, VENUE_IDS } from "./constants";
import type { OrderFlowSnapshot, VenueDiagnostics, VenueId, VenueMetrics } from "./types";

/** 아직 아무 데이터도 없는 거래소 지표. 첫 렌더와 SSR 에서 쓴다. */
export function createEmptyVenueMetrics(venue: VenueId): VenueMetrics {
  return {
    venue,
    status: "connecting",
    midPriceInQuote: 0,
    spreadInQuote: 0,
    bestBidPriceInQuote: 0,
    bestAskPriceInQuote: 0,
    bookImbalance: 0,
    tradePressure: 0,
    momentum: 0,
    venuePressure: 0,
    latencyInMs: UNKNOWN_LATENCY_IN_MS,
    buyVolumeInBtc: 0,
    sellVolumeInBtc: 0,
    lastMessageAtInMs: 0,
    lastOrderBookAtInMs: 0,
    lastTradeAtInMs: 0,
  };
}

export function createEmptyVenueDiagnostics(): VenueDiagnostics {
  return {
    reconnectCount: 0,
    resyncCount: 0,
    sequenceGapCount: 0,
    parseErrorCount: 0,
  };
}

/**
 * 빈 스냅샷.
 *
 * 서버 렌더 결과와 클라이언트 첫 렌더가 같아야 하이드레이션 경고가 나지 않으므로,
 * 실제 데이터가 붙기 전에는 항상 이 값을 쓴다.
 */
export function createEmptyOrderFlowSnapshot(): OrderFlowSnapshot {
  const venues = {} as Record<VenueId, VenueMetrics>;
  const diagnostics = {} as Record<VenueId, VenueDiagnostics>;

  for (const venue of VENUE_IDS) {
    venues[venue] = createEmptyVenueMetrics(venue);
    diagnostics[venue] = createEmptyVenueDiagnostics();
  }

  return {
    venues,
    diagnostics,
    aggregatePressure: 0,
    includedVenues: [],
    tradesPerSecond: 0,
    updatedAtInMs: 0,
  };
}
