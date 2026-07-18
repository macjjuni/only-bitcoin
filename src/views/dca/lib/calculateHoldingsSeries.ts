import type { TradeRecord } from "@/entities/dca";
import { getTodayString } from "./format";
import { applyTradeSats, satsToBtc } from "./satoshi";
import { sortTradeRecords } from "./sortTradeRecords";

const DAY_MS = 86_400_000;

export interface HoldingsSeriesPoint {
  x: number; // 날짜 (timestamp, ms)
  y: number; // 해당 날짜 마감 기준 누적 보유량 (BTC)
}

/**
 * "YYYY-MM-DD" 문자열을 로컬 자정 기준 timestamp(ms)로 변환.
 */
const dateToTimestamp = (date: string): number => {
  return new Date(`${date}T00:00:00`).getTime();
};

/**
 * 매매 기록을 날짜 오름차순으로 누적해 일자별 보유량(BTC) 시계열을 생성.
 *
 * - 부동소수점 오차를 막기 위해 내부 누적은 사토시(정수) 기준.
 * - 동일 날짜의 기록은 하나의 포인트로 합산한다.
 * - 보유량을 초과하는 매도는 보유분까지만 차감한다. (calculateDcaSummary와 동일 기준)
 * - 첫 기록 전날 보유량 0 기준점을 추가한다. (기록이 하루뿐이어도 선이 그려지도록)
 * - 마지막 기록이 오늘 이전이면 오늘 날짜 포인트를 추가해 라인을 현재까지 연장한다.
 *
 * @param records - 매매 기록 목록 (날짜순 정렬 전제 없음)
 */
export function calculateHoldingsSeries(records: TradeRecord[]): HoldingsSeriesPoint[] {
  if (records.length === 0) {
    return [];
  }

  const sortedRecords = sortTradeRecords(records, "dateAsc");

  let holdingSats = 0;
  const satsByDate = new Map<string, number>();

  for (const record of sortedRecords) {
    holdingSats = applyTradeSats(holdingSats, record);
    satsByDate.set(record.date, holdingSats);
  }

  const points: HoldingsSeriesPoint[] = [...satsByDate.entries()].map(([date, sats]) => ({
    x: dateToTimestamp(date),
    y: satsToBtc(sats),
  }));

  const firstDate = sortedRecords[0].date;
  points.unshift({ x: dateToTimestamp(firstDate) - DAY_MS, y: 0 });

  const today = getTodayString();
  const lastDate = sortedRecords[sortedRecords.length - 1].date;

  if (lastDate < today) {
    points.push({ x: dateToTimestamp(today), y: satsToBtc(holdingSats) });
  }

  return points;
}
