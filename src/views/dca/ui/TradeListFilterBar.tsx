"use client";

import { KSelect, type KSelectValue } from "kku-ui";
import { memo } from "react";
import type { TradeType } from "@/entities/dca";
import { SegmentedControl, type SegmentedControlOption } from "@/shared/ui";
import type { TradeSortType } from "../lib/sortTradeRecords";

export type TradeTypeFilter = "all" | TradeType;

interface TradeListFilterBarProps {
  typeFilter: TradeTypeFilter;
  sortType: TradeSortType;
  onChangeTypeFilter: (typeFilter: TradeTypeFilter) => void;
  onChangeSortType: (sortType: TradeSortType) => void;
}

const typeFilterOptions: Array<SegmentedControlOption<TradeTypeFilter>> = [
  { label: "전체", value: "all" },
  { label: "매수", value: "buy", activeClassName: "bg-up/15 text-up" },
  { label: "매도", value: "sell", activeClassName: "bg-down/15 text-down" },
];

const sortOptions: Array<{ label: string; value: TradeSortType }> = [
  { label: "최신순", value: "dateDesc" },
  { label: "오래된순", value: "dateAsc" },
  { label: "수량 많은순", value: "btcCountDesc" },
  { label: "수량 적은순", value: "btcCountAsc" },
];

const TradeListFilterBar = (props: TradeListFilterBarProps) => {
  // region [Hooks]
  const { typeFilter, sortType, onChangeTypeFilter, onChangeSortType } = props;
  // endregion

  // region [Events]
  const onChangeSort = (value: KSelectValue) => {
    onChangeSortType(value as TradeSortType);
  };
  // endregion

  return (
    <div className="flex items-center justify-between gap-2">
      <SegmentedControl
        size="sm"
        options={typeFilterOptions}
        value={typeFilter}
        onChange={onChangeTypeFilter}
      />

      <KSelect value={sortType} options={sortOptions} width="sm" onChange={onChangeSort} />
    </div>
  );
};

const MemoizedTradeListFilterBar = memo(TradeListFilterBar);
MemoizedTradeListFilterBar.displayName = "TradeListFilterBar";

export default MemoizedTradeListFilterBar;
