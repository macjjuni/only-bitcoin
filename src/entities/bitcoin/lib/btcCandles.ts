import type { BtcCandle } from "../model/market";

/**
 * 실시간 캔들 병합 규칙.
 *
 * REST 로 받은 지난 캔들 위에 웹소켓이 밀어 주는 진행 중 캔들을 덮어 씀.
 * 소켓은 같은 봉을 2초마다 다시 보내고, 봉이 마감되면 다음 봉을 새로 보냄.
 */

/** 바이낸스 kline 스트림 메시지 중 쓰는 필드. 숫자는 전부 문자열로 옴. */
interface BinanceKlinePayload {
  t: number;
  o: string;
  h: string;
  l: string;
  c: string;
  q: string;
}

const toFiniteNumber = (value: unknown): number | null => {
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

/** kline 메시지를 캔들로 바꿈. 모양이 다르거나 값이 깨졌으면 `null`. */
export const parseBinanceKlineMessage = (message: unknown): BtcCandle | null => {
  const kline = (message as { k?: Partial<BinanceKlinePayload> } | null)?.k;

  if (!kline) {
    return null;
  }

  const openTime = toFiniteNumber(kline.t);
  const open = toFiniteNumber(kline.o);
  const high = toFiniteNumber(kline.h);
  const low = toFiniteNumber(kline.l);
  const close = toFiniteNumber(kline.c);
  const quoteVolume = toFiniteNumber(kline.q);

  if (
    openTime === null ||
    open === null ||
    high === null ||
    low === null ||
    close === null ||
    quoteVolume === null
  ) {
    return null;
  }

  return { openTime, open, high, low, close, quoteVolume };
};

/**
 * 진행 중 캔들 하나를 목록에 반영함.
 *
 * - 마지막 봉과 시작 시각이 같으면 덮어씀(봉이 자라는 중).
 * - 더 늦게 시작한 봉이면 뒤에 붙이고 앞에서 잘라 개수를 유지함(새 봉 시작).
 * - 더 이른 봉은 늦게 도착한 메시지라 버림.
 */
export const mergeLiveCandle = (
  candles: readonly BtcCandle[],
  liveCandle: BtcCandle,
  maxCount: number,
): BtcCandle[] => {
  const lastCandle = candles[candles.length - 1];

  if (!lastCandle) {
    return [liveCandle];
  }
  if (liveCandle.openTime === lastCandle.openTime) {
    return [...candles.slice(0, -1), liveCandle];
  }
  if (liveCandle.openTime < lastCandle.openTime) {
    return [...candles];
  }

  return [...candles, liveCandle].slice(-maxCount);
};

/**
 * 소켓 봉이 지난 봉 바로 다음 칸이 아닌지 본다.
 *
 * x 축이 시간이 아니라 인덱스라서 빠진 봉이 화면에서 안 보임. 몇 시간 비어
 * 있어도 마지막 한 칸만 뚝 떨어진 그림이 되고, 차트 몸통은 과거에 멈춘 채로
 * 남음. 벌어진 걸 알면 호출부가 지난 봉을 다시 받아 메움.
 */
export const hasCandleGap = (
  candles: readonly BtcCandle[],
  liveCandle: BtcCandle,
  intervalMs: number,
): boolean => {
  const lastCandle = candles[candles.length - 1];

  if (!lastCandle) {
    return false;
  }

  return liveCandle.openTime - lastCandle.openTime > intervalMs;
};

/**
 * REST 로 다시 받은 지난 캔들에 소켓이 이미 준 최신 봉을 얹음.
 *
 * REST 응답은 요청 시점 값이라 소켓보다 늦을 수 있음. 소켓 봉이 같거나
 * 더 최신이면 그 값을 살려서 차트가 뒤로 튀지 않게 함.
 */
export const mergeCandleHistory = (
  history: readonly BtcCandle[],
  liveCandle: BtcCandle | null,
  maxCount: number,
): BtcCandle[] => {
  const trimmedHistory = history.slice(-maxCount);

  return liveCandle ? mergeLiveCandle(trimmedHistory, liveCandle, maxCount) : trimmedHistory;
};
