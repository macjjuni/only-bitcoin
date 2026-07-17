"use client";

import { KButton, KPopover, KPopoverContent, KPopoverTrigger, kToast } from "kku-ui";
import { Pencil, Trash2 } from "lucide-react";
import { memo } from "react";
import { type PurchaseRecord, useDcaStore } from "@/entities/dca";
import { comma } from "@/shared/utils/string";
import { formatBtc } from "../lib/format";

interface PurchaseListItemProps {
  record: PurchaseRecord;
  onClickEdit: (record: PurchaseRecord) => void;
}

const PurchaseListItem = ({ record, onClickEdit }: PurchaseListItemProps) => {
  // region [Hooks]
  const removeRecord = useDcaStore((state) => state.removeRecord);
  // endregion

  // region [Privates]
  const totalCost = Math.round(record.btcCount * record.price);
  // endregion

  // region [Events]
  const onClickEditItem = () => {
    onClickEdit(record);
  };

  const onClickRemoveItem = () => {
    removeRecord(record.id);
    kToast.success("매수 기록을 삭제했어요.");
  };
  // endregion

  return (
    <li className="flex items-center justify-between gap-2 px-4 py-3 font-number">
      <div className="flex min-w-0 flex-col gap-0.5">
        <span className="text-xs text-muted-foreground">{record.date}</span>
        <span className="text-md font-bold">
          <span className="text-bitcoin">₿</span> {formatBtc(record.btcCount)}
        </span>
      </div>

      <div className="flex min-w-0 flex-col gap-0.5 text-right">
        <span className="text-xs text-muted-foreground">₩{comma(record.price)}</span>
        <span className="text-md font-bold">₩{comma(totalCost)}</span>
      </div>

      <div className="flex flex-none items-center">
        <KButton variant="ghost" size="icon" onClick={onClickEditItem}>
          <Pencil size={16} />
        </KButton>
        <KPopover>
          <KPopoverTrigger asChild>
            <KButton variant="ghost" size="icon">
              <Trash2 size={16} />
            </KButton>
          </KPopoverTrigger>
          <KPopoverContent side="top" align="end" sideOffset={4} className="w-auto p-1.5">
            <KButton variant="ghost" size="sm" className="text-down" onClick={onClickRemoveItem}>
              삭제하기
            </KButton>
          </KPopoverContent>
        </KPopover>
      </div>
    </li>
  );
};

const MemoizedPurchaseListItem = memo(PurchaseListItem);
MemoizedPurchaseListItem.displayName = "PurchaseListItem";

export default MemoizedPurchaseListItem;
