/** 비트코인 총 발행량. 게이지의 분모라 상수로 고정함. */
export const TOTAL_BITCOIN_SUPPLY_IN_BTC = 21_000_000;

/** 발행량 게이지 칸 수. 1칸 = 100만 BTC 라서 21칸임. */
export const SUPPLY_GAUGE_SEGMENT_COUNT = 21;

/**
 * 총 발행량(2,100만 BTC) 대비 비중(%).
 *
 * 응답의 `market_cap_dominance` 도 값이 비슷하지만, 게이지 눈금이 2,100만 BTC 인 이상
 * 분모를 화면에서 직접 잡아야 숫자와 눈금이 안 어긋남.
 */
export function calculateSupplySharePercent(totalHoldingsInBtc: number): number {
  if (!Number.isFinite(totalHoldingsInBtc) || totalHoldingsInBtc <= 0) {
    return 0;
  }

  return (totalHoldingsInBtc / TOTAL_BITCOIN_SUPPLY_IN_BTC) * 100;
}

/** 게이지에서 채워질 칸 수. 소수를 남겨 마지막 칸을 부분만 채움. */
export function calculateFilledSegmentCount(supplySharePercent: number): number {
  return (supplySharePercent / 100) * SUPPLY_GAUGE_SEGMENT_COUNT;
}

/**
 * 게이지 한 칸이 얼마나 채워졌는지(0~1).
 *
 * 칸을 정수로 반올림하면 6.11% 처럼 애매한 비중이 1칸으로 뭉개짐.
 * 마지막 칸만 소수로 채워 실제 비중과 눈금을 맞췄음.
 */
export function calculateSegmentFillRatio(
  segmentIndex: number,
  filledSegmentCount: number,
): number {
  return Math.min(1, Math.max(0, filledSegmentCount - segmentIndex));
}
