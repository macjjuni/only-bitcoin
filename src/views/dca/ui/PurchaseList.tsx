"use client";

import { memo, useMemo } from "react";
import { type PurchaseRecord, useDcaStore } from "@/entities/dca";
import { Card } from "@/shared/ui";
import PurchaseListItem from "./PurchaseListItem";

interface PurchaseListProps {
  onClickEdit: (record: PurchaseRecord) => void;
}

const PurchaseList = ({ onClickEdit }: PurchaseListProps) => {
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
        <p className="p-6 text-center text-sm text-muted-foreground">
          아직 매수 기록이 없어요.
          <br />첫 매수 기록을 추가해 보세요! 🥕
        </p>
      </Card>
    );
  }

  return (
    <Card>
      <ul className="divide-y-[0.75px] divide-neutral-300 dark:divide-neutral-600">
        {sortedRecords.map((record) => (
          <PurchaseListItem key={record.id} record={record} onClickEdit={onClickEdit} />
        ))}
      </ul>
    </Card>
  );
};

const MemoizedPurchaseList = memo(PurchaseList);
MemoizedPurchaseList.displayName = "PurchaseList";

export default MemoizedPurchaseList;
