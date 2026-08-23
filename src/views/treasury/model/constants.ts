import type { SegmentedControlOption } from "@/shared/ui";
import type { TreasurySortKey } from "../lib/sortCompanies";

/** 목록 정렬 세그먼트 옵션. */
export const TREASURY_SORT_OPTIONS: Array<SegmentedControlOption<TreasurySortKey>> = [
  { label: "보유량", value: "holdings" },
  { label: "수익률", value: "profitRate" },
  { label: "발행량 비중", value: "supplyShare" },
];

/** 처음 보여줄 기업 수. 목록이 200곳을 넘어 전부 그리면 첫 페인트가 무거워진다. */
export const INITIAL_VISIBLE_COMPANY_COUNT = 20;

/** "더 보기" 를 누를 때마다 추가로 보여줄 기업 수. */
export const LOAD_MORE_COMPANY_COUNT = 20;
