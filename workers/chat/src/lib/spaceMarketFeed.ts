import { SPACE_BGM_SURGE } from "../../../../src/entities/space/lib/marketSurge";

export interface SpaceMarketSample {
  price: number;
  referencePrice: number;
  atMs: number;
}

export class MarketFeedError extends Error {
  constructor(readonly retryAfterMs: number) {
    super("Bitcoin market data unavailable");
  }
}

/** 전광판과 같은 BTCUSDT 30분봉. 현재 봉의 시가와 최신 체결가를 한 요청으로 받는다. */
export const fetchSpaceMarketSample = async (): Promise<SpaceMarketSample> => {
  const response = await fetch(
    "https://data-api.binance.vision/api/v3/klines?symbol=BTCUSDT&interval=30m&limit=2",
    { signal: AbortSignal.timeout(5000), cache: "no-store" },
  );
  if (!response.ok) {
    const retrySeconds = Number(response.headers.get("Retry-After"));
    throw new MarketFeedError(
      response.status === 429 || response.status === 418
        ? Math.max(
            60_000,
            Math.min(300_000, (Number.isFinite(retrySeconds) ? retrySeconds : 60) * 1000),
          )
        : 20_000,
    );
  }
  const payload: unknown = await response.json();
  const now = Date.now();
  const openTime =
    Math.floor(now / SPACE_BGM_SURGE.candleIntervalMs) * SPACE_BGM_SURGE.candleIntervalMs;
  const candle: unknown = Array.isArray(payload)
    ? payload.find((row) => Array.isArray(row) && row[0] === openTime)
    : null;
  if (!Array.isArray(candle)) {
    throw new MarketFeedError(20_000);
  }
  const referencePrice = Number(candle[1]);
  const price = Number(candle[4]);
  if (
    !Number.isFinite(referencePrice) ||
    !Number.isFinite(price) ||
    referencePrice <= 0 ||
    price <= 0
  ) {
    throw new MarketFeedError(20_000);
  }
  return { referencePrice, price, atMs: now };
};
