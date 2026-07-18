"use client";

import { KButton, KPopover, KPopoverContent, KPopoverTrigger, kToast } from "kku-ui";
import { NotepadText, Pencil, Trash2 } from "lucide-react";
import { memo } from "react";
import { type TradeRecord, useDcaStore } from "@/entities/dca";
import { comma } from "@/shared/utils/string";
import { formatBtc } from "../lib/format";

interface TradeListItemProps {
  record: TradeRecord;
  onClickEdit: (record: TradeRecord) => void;
}

const TradeListItem = ({ record, onClickEdit }: TradeListItemProps) => {
  // region [Hooks]
  const removeRecord = useDcaStore((state) => state.removeRecord);
  // endregion

  // region [Privates]
  const isBuy = record.type === "buy";
  const totalAmount = Math.round(record.btcCount * record.price);
  // endregion

  // region [Events]
  const onClickEditItem = () => {
    onClickEdit(record);
  };

  const onClickRemoveItem = () => {
    removeRecord(record.id);
    kToast.success(`${isBuy ? "매수" : "매도"} 기록을 삭제했어요.`);
  };
  // endregion

  return (
    <li className="flex items-center justify-between gap-2 px-4 py-3 font-number">
      <div className="flex min-w-0 flex-col gap-1">
        <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <span
            className={`rounded px-1 py-px font-default font-bold ${
              isBuy ? "bg-up/15 text-up" : "bg-down/15 text-down"
            }`}
          >
            {isBuy ? "매수" : "매도"}
          </span>
          {record.date}
        </span>
        <span className="text-md font-bold">
          <span className="text-bitcoin">₿</span> {isBuy ? "" : "-"}
          {formatBtc(record.btcCount)}
        </span>
      </div>

      <div className="flex min-w-0 flex-col gap-1 text-right">
        <span className="text-xs text-muted-foreground">₩{comma(record.price)}</span>
        <span className="text-md font-bold">₩{comma(totalAmount)}</span>
      </div>

      <div className="flex flex-none items-center">
        {record.memo && (
          <KPopover>
            <KPopoverTrigger asChild>
              <KButton variant="ghost" size="icon" aria-label="메모 보기">
                <NotepadText size={16} />
              </KButton>
            </KPopoverTrigger>
            <KPopoverContent side="top" align="end" sideOffset={4} className="max-w-60 p-3">
              <p className="whitespace-pre-wrap break-words text-sm font-default">{record.memo}</p>
            </KPopoverContent>
          </KPopover>
        )}
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

const MemoizedTradeListItem = memo(TradeListItem);
MemoizedTradeListItem.displayName = "TradeListItem";

export default MemoizedTradeListItem;
