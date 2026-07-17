import type { PurchaseRecord } from "../model/dcaStore";

const SATOSHI_PER_BTC = 100_000_000;

export interface DcaSummaryData {
  totalBtcCount: number; // 총 보유 개수 (BTC)
  totalCost: number; // 총 매수금액 (KRW)
  avgPrice: number; // 평단가 (KRW/BTC)
  remainingBtcCount: number; // 목표까지 남은 개수 (BTC)
  achievementRate: number; // 목표 달성률 (%)
  valuation: number; // 평가금액 (KRW)
  profit: number; // 평가손익 (KRW)
  profitRate: number; // 수익률 (%)
}

/**
 * BTC 개수를 사토시(정수) 단위로 변환한다.
 * 부동소수점 합산 오차를 막기 위해 내부 계산은 사토시 기준으로 수행한다.
 */
const btcToSats = (btcCount: number): number => {
  return Math.round(btcCount * SATOSHI_PER_BTC);
};

/**
 * 매수 기록과 현재 시세를 기반으로 평단가·목표·수익 요약 지표를 계산한다.
 *
 * @param records - 매수 기록 목록
 * @param targetBtcCount - 목표 보유 개수 (BTC)
 * @param currentPrice - 현재 1BTC당 시세 (KRW). 0이면 평가 지표는 0으로 반환.
 */
export function calculateDcaSummary(
  records: PurchaseRecord[],
  targetBtcCount: number,
  currentPrice: number,
): DcaSummaryData {
  const totalSats = records.reduce((acc, { btcCount }) => acc + btcToSats(btcCount), 0);
  const totalBtcCount = totalSats / SATOSHI_PER_BTC;
  const totalCost = records.reduce(
    (acc, { btcCount, price }) => acc + Math.round((btcToSats(btcCount) * price) / SATOSHI_PER_BTC),
    0,
  );

  const avgPrice = totalBtcCount > 0 ? Math.round(totalCost / totalBtcCount) : 0;

  const targetSats = btcToSats(targetBtcCount);
  const remainingBtcCount = Math.max(targetSats - totalSats, 0) / SATOSHI_PER_BTC;
  const achievementRate = targetSats > 0 ? Math.min((totalSats / targetSats) * 100, 100) : 0;

  const valuation = currentPrice > 0 ? Math.round(totalBtcCount * currentPrice) : 0;
  const profit = valuation > 0 ? valuation - totalCost : 0;
  const profitRate = valuation > 0 && totalCost > 0 ? (profit / totalCost) * 100 : 0;

  return {
    totalBtcCount,
    totalCost,
    avgPrice,
    remainingBtcCount,
    achievementRate,
    valuation,
    profit,
    profitRate,
  };
}
