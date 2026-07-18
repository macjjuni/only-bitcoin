import type { TradeRecord } from "@/entities/dca";
import { applyTradeSats, btcToSats, SATOSHI_PER_BTC, satsToBtc } from "./satoshi";
import { sortTradeRecords } from "./sortTradeRecords";

export interface DcaSummaryData {
  totalBtcCount: number; // 총 보유 개수 (BTC)
  totalCost: number; // 보유분 매수원가 (KRW)
  avgPrice: number; // 평단가 (KRW/BTC)
  remainingBtcCount: number; // 목표까지 남은 개수 (BTC)
  achievementRate: number; // 목표 달성률 (%)
  valuation: number; // 평가금액 (KRW)
  profit: number; // 평가손익 (KRW)
  profitRate: number; // 수익률 (%)
}

/**
 * 매매 기록과 현재 시세를 기반으로 평단가·목표·수익 요약 지표를 계산.
 *
 * 이동평균법 기준:
 * - 매수 시 보유원가에 매수금액을 누적하고, 매도 시 평단가는 유지한 채
 *   매도 수량만큼 원가를 비례 차감한다.
 * - 보유량을 초과하는 매도는 보유분까지만 반영한다.
 *
 * @param records - 매매 기록 목록 (날짜순 정렬 전제 없음)
 * @param targetBtcCount - 목표 보유 개수 (BTC)
 * @param currentPrice - 현재 1BTC당 시세 (KRW). 0이면 평가 지표는 0으로 반환.
 */
export function calculateDcaSummary(
  records: TradeRecord[],
  targetBtcCount: number,
  currentPrice: number,
): DcaSummaryData {
  // 이동평균법은 체결 순서에 의존하므로 날짜 오름차순(동일 날짜는 입력 순서 유지)으로 계산한다.
  const sortedRecords = sortTradeRecords(records, "dateAsc");

  let holdingSats = 0;
  let holdingCost = 0;

  for (const record of sortedRecords) {
    const sats = btcToSats(record.btcCount);

    if (record.type === "buy") {
      holdingSats += sats;
      holdingCost += Math.round((sats * record.price) / SATOSHI_PER_BTC);
      continue;
    }

    const sellSats = Math.min(sats, holdingSats);
    if (sellSats === 0) {
      continue;
    }

    const costOfSold = Math.round((holdingCost * sellSats) / holdingSats);

    holdingCost -= costOfSold;
    holdingSats -= sellSats;
  }

  const totalBtcCount = satsToBtc(holdingSats);
  const totalCost = holdingCost;
  const avgPrice = totalBtcCount > 0 ? Math.round(totalCost / totalBtcCount) : 0;

  const targetSats = btcToSats(targetBtcCount);
  const remainingBtcCount = satsToBtc(Math.max(targetSats - holdingSats, 0));
  const achievementRate = targetSats > 0 ? Math.min((holdingSats / targetSats) * 100, 100) : 0;

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

/**
 * 특정 기록을 제외한 현재 총 보유 개수(BTC)를 계산.
 * 매도 폼에서 매도 가능 수량 검증에 사용한다.
 *
 * @param records - 매매 기록 목록
 * @param excludeId - 계산에서 제외할 기록 id (수정 모드에서 자기 자신 제외용)
 */
export function calculateHoldingBtcCount(records: TradeRecord[], excludeId?: string): number {
  // 요약·차트와 동일하게 날짜순으로 기록별 클램프를 적용해 보유량 계산 기준을 일치시킨다.
  const holdingSats = sortTradeRecords(records, "dateAsc")
    .filter((record) => record.id !== excludeId)
    .reduce((acc, record) => applyTradeSats(acc, record), 0);

  return satsToBtc(holdingSats);
}
