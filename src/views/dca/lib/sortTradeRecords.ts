import type { TradeRecord } from "@/entities/dca";

export type TradeSortType = "dateDesc" | "dateAsc" | "btcCountDesc" | "btcCountAsc";

/** 수량 정렬용 부호 반영 수량 (매도는 음수 취급) */
const getSignedBtcCount = (record: TradeRecord): number => {
  return record.type === "sell" ? -record.btcCount : record.btcCount;
};

/** 정렬 옵션별 비교 함수 */
const sortComparators: Record<TradeSortType, (a: TradeRecord, b: TradeRecord) => number> = {
  dateDesc: (a, b) => b.date.localeCompare(a.date),
  dateAsc: (a, b) => a.date.localeCompare(b.date),
  btcCountDesc: (a, b) => getSignedBtcCount(b) - getSignedBtcCount(a),
  btcCountAsc: (a, b) => getSignedBtcCount(a) - getSignedBtcCount(b),
};

/**
 * 매매 기록을 정렬 옵션에 따라 정렬한 새 배열을 반환.
 * 정렬은 stable 하므로 동일 키(예: 같은 날짜)는 입력 순서를 유지한다.
 */
export const sortTradeRecords = (
  records: TradeRecord[],
  sortType: TradeSortType,
): TradeRecord[] => {
  return [...records].sort(sortComparators[sortType]);
};
