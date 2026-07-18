"use client";

import { KButton, KSelect, type KSelectValue } from "kku-ui";
import { memo } from "react";
import type { TradeType } from "@/entities/dca";

export type TradeTypeFilter = "all" | TradeType;
export type TradeSortType = "dateDesc" | "dateAsc" | "btcCountDesc" | "btcCountAsc";

interface TradeListFilterBarProps {
  typeFilter: TradeTypeFilter;
  sortType: TradeSortType;
  onChangeTypeFilter: (typeFilter: TradeTypeFilter) => void;
  onChangeSortType: (sortType: TradeSortType) => void;
}

const typeFilterOptions: Array<{ label: string; value: TradeTypeFilter }> = [
  { label: "전체", value: "all" },
  { label: "매수", value: "buy" },
  { label: "매도", value: "sell" },
];

const sortOptions: Array<{ label: string; value: TradeSortType }> = [
  { label: "최신순", value: "dateDesc" },
  { label: "오래된순", value: "dateAsc" },
  { label: "수량 많은순", value: "btcCountDesc" },
  { label: "수량 적은순", value: "btcCountAsc" },
];

/** 타입 필터 선택 시 강조 스타일 */
const activeTypeFilterStyle: Record<TradeTypeFilter, string> = {
  all: "bg-white shadow-sm dark:bg-neutral-600 !text-foreground",
  buy: "bg-up/15 !text-up",
  sell: "bg-down/15 !text-down",
};

const TradeListFilterBar = (props: TradeListFilterBarProps) => {
  // region [Hooks]
  const { typeFilter, sortType, onChangeTypeFilter, onChangeSortType } = props;
  // endregion

  // region [Events]
  const onClickTypeFilter = (filter: TradeTypeFilter) => {
    onChangeTypeFilter(filter);
  };

  const onChangeSort = (value: KSelectValue) => {
    onChangeSortType(value as TradeSortType);
  };
  // endregion

  return (
    <div className="flex items-center justify-between gap-2">
      <div className="flex rounded-lg bg-neutral-200/70 p-0.5 dark:bg-neutral-800">
        {typeFilterOptions.map((option) => (
          <KButton
            key={option.value}
            variant="ghost"
            size="sm"
            className={`font-default text-xs font-bold ${
              typeFilter === option.value
                ? activeTypeFilterStyle[option.value]
                : "text-muted-foreground"
            }`}
            onClick={() => onClickTypeFilter(option.value)}
          >
            {option.label}
          </KButton>
        ))}
      </div>

      <KSelect value={sortType} options={sortOptions} width="sm" onChange={onChangeSort} />
    </div>
  );
};

const MemoizedTradeListFilterBar = memo(TradeListFilterBar);
MemoizedTradeListFilterBar.displayName = "TradeListFilterBar";

export default MemoizedTradeListFilterBar;
