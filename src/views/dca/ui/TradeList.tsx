"use client";

import { memo, useMemo, useState } from "react";
import { type TradeRecord, useDcaStore } from "@/entities/dca";
import { Card } from "@/shared/ui";
import TradeListFilterBar, { type TradeSortType, type TradeTypeFilter } from "./TradeListFilterBar";
import TradeListItem from "./TradeListItem";

interface TradeListProps {
  onClickEdit: (record: TradeRecord) => void;
}

/** 수량 정렬용 부호 반영 수량 (매도는 음수 취급) */
const getSignedBtcCount = (record: TradeRecord) => {
  return record.type === "sell" ? -record.btcCount : record.btcCount;
};

/** 정렬 옵션별 비교 함수 */
const sortComparators: Record<TradeSortType, (a: TradeRecord, b: TradeRecord) => number> = {
  dateDesc: (a, b) => b.date.localeCompare(a.date),
  dateAsc: (a, b) => a.date.localeCompare(b.date),
  btcCountDesc: (a, b) => getSignedBtcCount(b) - getSignedBtcCount(a),
  btcCountAsc: (a, b) => getSignedBtcCount(a) - getSignedBtcCount(b),
};

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

    return [...filtered].sort(sortComparators[sortType]);
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
    return (
      <Card>
        <p className="py-8 text-center text-sm text-muted-foreground">
          + 버튼을 눌러 첫 기록을 추가해 보세요.
        </p>
      </Card>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <TradeListFilterBar
        typeFilter={typeFilter}
        sortType={sortType}
        onChangeTypeFilter={onChangeTypeFilter}
        onChangeSortType={onChangeSortType}
      />

      <Card>
        {filteredRecords.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            조건에 맞는 기록이 없어요.
          </p>
        ) : (
          <ul className="divide-y-[0.75px] divide-neutral-300 dark:divide-neutral-600">
            {filteredRecords.map((record) => (
              <TradeListItem key={record.id} record={record} onClickEdit={onClickEdit} />
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
};

const MemoizedTradeList = memo(TradeList);
MemoizedTradeList.displayName = "TradeList";

export default MemoizedTradeList;
