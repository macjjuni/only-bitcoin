import type { TradeRecord } from "@/entities/dca";
import { btcToSats, SATOSHI_PER_BTC } from "./satoshi";

export interface RecordProfit {
  profit: number; // 평가손익 (KRW)
  profitRate: number; // 수익률 (%)
}

/**
 * 매매 기록 1건의 체결금액(KRW)을 계산.
 * 사토시(정수) 기준으로 계산해 요약·차트와 반올림 기준을 일치시킨다.
 */
export function calculateTradeAmount(btcCount: number, price: number): number {
  return Math.round((btcToSats(btcCount) * price) / SATOSHI_PER_BTC);
}

/**
 * 매수 기록 1건의 현재가 기준 평가손익을 계산.
 *
 * - 매수 기록만 대상으로 한다. 매도 기록은 이미 청산된 물량이라 현재가와 비교해도
 *   손익이 아닌 기회비용이 되고, 실현손익은 매도 시점 평단가(전체 이력 필요)가 있어야
 *   구할 수 있으므로 여기서 계산하지 않는다.
 * - 이후 일부/전부 매도된 물량도 구분하지 않는다. 기록 단위 조회이므로
 *   "이 건을 지금까지 들고 있었다면" 기준으로 본다. (요약 카드의 평가손익과는 기준이 다름)
 *
 * @param record - 매매 기록 1건
 * @param currentPrice - 현재 1BTC당 시세 (KRW)
 * @returns 계산 대상이 아니거나 시세를 아직 못 받았으면 null
 */
export function calculateRecordProfit(
  record: TradeRecord,
  currentPrice: number,
): RecordProfit | null {
  if (record.type !== "buy" || currentPrice <= 0 || record.price <= 0 || record.btcCount <= 0) {
    return null;
  }

  const cost = calculateTradeAmount(record.btcCount, record.price);

  if (cost === 0) {
    return null;
  }

  const valuation = calculateTradeAmount(record.btcCount, currentPrice);
  const profit = valuation - cost;

  return { profit, profitRate: (profit / cost) * 100 };
}
