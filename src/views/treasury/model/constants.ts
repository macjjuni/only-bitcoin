import type { SegmentedControlOption } from "@/shared/ui";
import type { TreasurySortKey } from "../lib/sortCompanies";

/** 목록 정렬 세그먼트 옵션. */
export const TREASURY_SORT_OPTIONS: Array<SegmentedControlOption<TreasurySortKey>> = [
  { label: "보유량", value: "holdings" },
  { label: "수익률", value: "profitRate" },
  { label: "발행량 비중", value: "supplyShare" },
];

/** 처음 보여줄 기업 수. 상위 10곳만 먼저 보여 주고 나머지는 "전체보기" 로 한 번에 펼침. */
export const INITIAL_VISIBLE_COMPANY_COUNT = 10;
