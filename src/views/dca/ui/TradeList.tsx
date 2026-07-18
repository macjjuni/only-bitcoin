"use client";

import { memo, useMemo } from "react";
import { type TradeRecord, useDcaStore } from "@/entities/dca";
import { Card } from "@/shared/ui";
import TradeListItem from "./TradeListItem";

interface TradeListProps {
  onClickEdit: (record: TradeRecord) => void;
}

const TradeList = ({ onClickEdit }: TradeListProps) => {
  // region [Hooks]
  const records = useDcaStore((state) => state.records);
  // endregion

  // region [Privates]
  const sortedRecords = useMemo(() => {
    return [...records].sort((a, b) => b.date.localeCompare(a.date));
  }, [records]);
  // endregion

  if (sortedRecords.length === 0) {
    return (
      <Card>
        <p className="py-8 text-center text-sm text-muted-foreground">
          + 버튼을 눌러 첫 기록을 추가해 보세요.
        </p>
      </Card>
    );
  }

  return (
    <Card>
      <ul className="divide-y-[0.75px] divide-neutral-300 dark:divide-neutral-600">
        {sortedRecords.map((record) => (
          <TradeListItem key={record.id} record={record} onClickEdit={onClickEdit} />
        ))}
      </ul>
    </Card>
  );
};

const MemoizedTradeList = memo(TradeList);
MemoizedTradeList.displayName = "TradeList";

export default MemoizedTradeList;
