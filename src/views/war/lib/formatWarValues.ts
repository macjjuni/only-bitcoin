import { type ConnectionStatus, VENUE_LABELS, type VenueId } from "@/entities/order-flow";
import { comma } from "@/shared/utils/string";

/** 상태별 한글 표기. 텍스트만으로도 캔버스와 같은 정보를 얻을 수 있어야 한다. */
export const STATUS_TEXTS: Record<ConnectionStatus, string> = {
  connecting: "연결 중",
  syncing: "동기화 중",
  live: "실시간",
  stale: "지연",
  error: "오류",
};

/** 상태별 배지 색. */
export const STATUS_BADGE_CLASSES: Record<ConnectionStatus, string> = {
  connecting: "bg-neutral-400/15 text-muted-foreground",
  syncing: "bg-bitcoin/15 text-bitcoin",
  live: "bg-up/15 text-up",
  stale: "bg-bitcoin/15 text-bitcoin",
  error: "bg-down/15 text-down",
};

/** 달러 가격 표기. 값이 없으면 `-`. */
export function formatUsdPrice(priceInUsd: number): string {
  if (priceInUsd <= 0) {
    return "-";
  }

  return `$${comma(priceInUsd.toFixed(2), false)}`;
}

/** 원화 가격 표기. 소수점은 의미가 없어 반올림한다. */
export function formatKrwPrice(priceInKrw: number): string {
  if (priceInKrw <= 0) {
    return "-";
  }

  return `₩${comma(Math.round(priceInKrw))}`;
}

/** 원·달러 환율 표기. */
export function formatExchangeRate(usdKrwRate: number): string {
  if (usdKrwRate <= 0) {
    return "-";
  }

  return `₩${comma(usdKrwRate.toFixed(2), false)}`;
}

/**
 * 거래소 가격 표기.
 *
 * 통화 기호를 붙여 어느 통화인지 항상 드러낸다. 진단 패널은 거래소가 준 원본 값을
 * 그대로 보여 주므로 여기서는 환산하지 않는다.
 */
export function formatPriceInQuote(venue: VenueId, priceInQuote: number): string {
  if (VENUE_LABELS[venue].quoteCurrency === "KRW") {
    return formatKrwPrice(priceInQuote);
  }

  return formatUsdPrice(priceInQuote);
}

/** 스프레드. 통화가 달라 거래소 간 비교는 하지 않고 각자 값만 보여 준다. */
export function formatSpreadInQuote(venue: VenueId, spreadInQuote: number): string {
  if (spreadInQuote <= 0) {
    return "-";
  }

  return VENUE_LABELS[venue].quoteCurrency === "KRW"
    ? `₩${comma(Math.round(spreadInQuote))}`
    : `$${spreadInQuote.toFixed(2)}`;
}

/** -1~1 압력을 매수 우세 비율(0~100)로 바꾼다. 50 이면 균형이다. */
export function toBuySharePercent(pressure: number): number {
  return ((pressure + 1) / 2) * 100;
}

/** 압력을 부호 붙은 백분율 문자열로. */
export function formatPressurePercent(pressure: number): string {
  const pressurePercent = pressure * 100;
  const signPrefix = pressurePercent > 0 ? "+" : "";

  return `${signPrefix}${pressurePercent.toFixed(0)}%`;
}

export function formatBtcAmount(sizeInBtc: number): string {
  if (sizeInBtc <= 0) {
    return "0";
  }

  return sizeInBtc >= 1 ? sizeInBtc.toFixed(2) : sizeInBtc.toFixed(4);
}

/**
 * 지연 표기.
 *
 * 음수는 아직 한 번도 재지 못한 상태다. 실제로 0ms 로 측정된 경우( 브라우저 시계가 거래소보다
 * 앞서 있을 때 흔하다 )와 구분해야 "데이터 없음"과 "지연 없음"이 섞이지 않는다.
 */
export function formatLatency(latencyInMs: number): string {
  if (latencyInMs < 0) {
    return "-";
  }

  return `${comma(Math.round(latencyInMs))}ms`;
}

/** 마지막 수신 시각을 "n초 전" 으로. */
export function formatElapsedSince(timestampInMs: number, nowInMs: number): string {
  if (timestampInMs <= 0) {
    return "-";
  }

  const elapsedInSeconds = Math.max(0, Math.round((nowInMs - timestampInMs) / 1000));

  return `${elapsedInSeconds}초 전`;
}
