import type { MarketChartIntervalType } from "@/entities/bitcoin";

export type ShareCardTimeframe = "1D" | "7D" | "1M" | "3M" | "6M" | "1Y" | "3Y" | "5Y" | "10Y";

/** 드롭다운 메뉴에 노출되는 전체 타임프레임 ( 짧은 기간 → 긴 기간 순 ) */
export const SHARE_CARD_TIMEFRAME_LIST: readonly ShareCardTimeframe[] = [
  "1D",
  "7D",
  "1M",
  "3M",
  "6M",
  "1Y",
  "3Y",
  "5Y",
  "10Y",
];

/** 카드 타임프레임 → 마켓 차트 조회 인터벌 매핑 */
export const SHARE_CARD_TIMEFRAME_INTERVAL_MAP: Record<
  ShareCardTimeframe,
  MarketChartIntervalType
> = {
  "1D": "1d",
  "7D": "7d",
  "1M": "1m",
  "3M": "3m",
  "6M": "6m",
  "1Y": "1y",
  "3Y": "3y",
  "5Y": "5y",
  "10Y": "10y",
};

/** 카드 가로 폭( 440px ) 제약으로 버튼에 동시 노출 가능한 타임프레임 개수 */
export const VISIBLE_TIMEFRAME_COUNT = 3;

/**
 * 선택된 타임프레임을 가운데 두고 좌우 한 칸씩 포함한 3개 윈도우를 반환.
 *
 * 목록의 양 끝( `1D` · `10Y` )은 가운데 배치가 불가능하므로 시작 인덱스를 끝쪽으로 고정한다.
 * ( `1D` → `1D · 7D · 1M`, `10Y` → `1Y · 5Y · 10Y` )
 */
export function getVisibleTimeframeWindow(
  selectedTimeframe: ShareCardTimeframe,
): ShareCardTimeframe[] {
  const selectedIndex = SHARE_CARD_TIMEFRAME_LIST.indexOf(selectedTimeframe);
  const lastStartIndex = SHARE_CARD_TIMEFRAME_LIST.length - VISIBLE_TIMEFRAME_COUNT;
  const startIndex = Math.min(Math.max(selectedIndex - 1, 0), lastStartIndex);

  return SHARE_CARD_TIMEFRAME_LIST.slice(startIndex, startIndex + VISIBLE_TIMEFRAME_COUNT);
}
