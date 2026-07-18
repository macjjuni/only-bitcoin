import type { TradeRecord } from "@/entities/dca";

export const SATOSHI_PER_BTC = 100_000_000;

/**
 * BTC 개수를 사토시(정수) 단위로 변환.
 * 부동소수점 합산 오차를 막기 위해 내부 계산은 사토시 기준.
 */
export const btcToSats = (btcCount: number): number => {
  return Math.round(btcCount * SATOSHI_PER_BTC);
};

/**
 * 사토시(정수)를 BTC 개수로 변환.
 */
export const satsToBtc = (sats: number): number => {
  return sats / SATOSHI_PER_BTC;
};

/**
 * 매매 기록 1건을 보유 사토시에 반영한 결과를 반환.
 * 보유량을 초과하는 매도는 보유분까지만 차감한다.
 */
export const applyTradeSats = (holdingSats: number, record: TradeRecord): number => {
  const sats = btcToSats(record.btcCount);

  if (record.type === "buy") {
    return holdingSats + sats;
  }
  return holdingSats - Math.min(sats, holdingSats);
};
