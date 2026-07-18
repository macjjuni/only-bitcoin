"use client";

import { memo, useMemo, useState } from "react";
import { type TradeRecord, useDcaStore } from "@/entities/dca";
import { Card } from "@/shared/ui";
import { sortTradeRecords, type TradeSortType } from "../lib/sortTradeRecords";
import EmptyMessageCard from "./EmptyMessageCard";
import TradeListFilterBar, { type TradeTypeFilter } from "./TradeListFilterBar";
import TradeListItem from "./TradeListItem";

interface TradeListProps {
  onClickEdit: (record: TradeRecord) => void;
}

const TradeList = ({ onClickEdit }: TradeListProps) => {
  // region [Hooks]
  const records = useDcaStore((state) => state.records);
  const [typeFilter, setTypeFilter] = useState<TradeTypeFilter>("all");
  const [sortType, setSortType] = useState<TradeSortType>("dateDesc");
  // endregion

  // region [Privates]
  const filteredRecords = useMemo(() => {
    const filtered =
      typeFilter === "all" ? records : records.filter((record) => record.type === typeFilter);

    return sortTradeRecords(filtered, sortType);
  }, [records, typeFilter, sortType]);
  // endregion

  // region [Events]
  const onChangeTypeFilter = (filter: TradeTypeFilter) => {
    setTypeFilter(filter);
  };

  const onChangeSortType = (sort: TradeSortType) => {
    setSortType(sort);
  };
  // endregion

  if (records.length === 0) {
    return <EmptyMessageCard>+ 버튼을 눌러 첫 기록을 추가해 보세요.</EmptyMessageCard>;
  }

  return (
    <div className="flex flex-col gap-2">
      <TradeListFilterBar
        typeFilter={typeFilter}
        sortType={sortType}
        onChangeTypeFilter={onChangeTypeFilter}
        onChangeSortType={onChangeSortType}
      />

      {filteredRecords.length === 0 ? (
        <EmptyMessageCard>조건에 맞는 기록이 없어요.</EmptyMessageCard>
      ) : (
        <Card>
          <ul className="divide-y-[0.75px] divide-neutral-300 dark:divide-neutral-600">
            {filteredRecords.map((record) => (
              <TradeListItem key={record.id} record={record} onClickEdit={onClickEdit} />
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
};

const MemoizedTradeList = memo(TradeList);
MemoizedTradeList.displayName = "TradeList";

export default MemoizedTradeList;
