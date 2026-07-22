"use client";

import {
  KButton,
  KDialog,
  KDialogContent,
  KDialogDescription,
  KDialogFooter,
  KDialogHeader,
  KDialogOverlay,
  KDialogTitle,
  KDropdownMenu,
  KDropdownMenuContent,
  KDropdownMenuItem,
  KDropdownMenuTrigger,
  KPopover,
  KPopoverContent,
  KPopoverTrigger,
  kToast,
} from "kku-ui";
import { Ellipsis, NotepadText, Pencil, Trash2 } from "lucide-react";
import { memo, useState } from "react";
import { type TradeRecord, useDcaStore } from "@/entities/dca";
import { UpdownIcon } from "@/shared/ui";
import { comma } from "@/shared/utils/string";
import { calculateRecordProfit, calculateTradeAmount } from "../lib/calculateRecordProfit";
import { formatBtc } from "../lib/format";

interface TradeListItemProps {
  record: TradeRecord;
  currentPrice: number;
  onClickEdit: (record: TradeRecord) => void;
}

const TradeListItem = ({ record, currentPrice, onClickEdit }: TradeListItemProps) => {
  // region [Hooks]
  const removeRecord = useDcaStore((state) => state.removeRecord);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  // endregion

  // region [Privates]
  const isBuy = record.type === "buy";
  const tradeTypeText = isBuy ? "매수" : "매도";
  const totalAmount = calculateTradeAmount(record.btcCount, record.price);

  // 매수 기록만 현재가 기준 평가손익을 표시한다. (매도·시세 미수신 시 null)
  const recordProfit = calculateRecordProfit(record, currentPrice);
  const isProfitUp = (recordProfit?.profit ?? 0) >= 0;
  // endregion

  // region [Events]
  const onSelectEditItem = () => {
    onClickEdit(record);
  };

  const onSelectDeleteItem = () => {
    setIsDeleteOpen(true);
  };

  const onOpenChangeDeleteDialog = (open: boolean) => {
    setIsDeleteOpen(open);
  };

  const onClickCancelDelete = () => {
    setIsDeleteOpen(false);
  };

  const onClickConfirmDelete = () => {
    removeRecord(record.id);
    setIsDeleteOpen(false);
    kToast.success(`${tradeTypeText} 기록을 삭제했어요.`);
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
            {tradeTypeText}
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
        {recordProfit && (
          <span
            className={`flex items-center justify-end gap-1 text-xs font-bold ${
              isProfitUp ? "text-up" : "text-down"
            }`}
          >
            <UpdownIcon size={7} isUp={isProfitUp} />₩{comma(Math.abs(recordProfit.profit))}
            <span className="font-normal">({recordProfit.profitRate.toFixed(2)}%)</span>
          </span>
        )}
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

        <KDropdownMenu size="md">
          <KDropdownMenuTrigger asChild>
            <KButton variant="ghost" size="icon" aria-label="기록 메뉴 열기">
              <Ellipsis size={16} />
            </KButton>
          </KDropdownMenuTrigger>
          <KDropdownMenuContent side="top" align="end" sideOffset={4}>
            <KDropdownMenuItem onSelect={onSelectEditItem}>
              <Pencil size={14} />
              수정
            </KDropdownMenuItem>
            <KDropdownMenuItem className="text-down" onSelect={onSelectDeleteItem}>
              <Trash2 size={14} />
              삭제
            </KDropdownMenuItem>
          </KDropdownMenuContent>
        </KDropdownMenu>
      </div>

      <KDialog open={isDeleteOpen} onOpenChange={onOpenChangeDeleteDialog} blur={2} size="sm">
        <KDialogOverlay />
        <KDialogContent className="!top-[44%]">
          <KDialogHeader>
            <KDialogTitle>
              <strong>기록 삭제</strong>
            </KDialogTitle>
          </KDialogHeader>
          <KDialogDescription className="text-sm font-default text-muted-foreground">
            {record.date} {tradeTypeText} 기록을 삭제할까요? 되돌릴 수 없어요.
          </KDialogDescription>
          <KDialogFooter>
            <KButton variant="ghost" onClick={onClickCancelDelete}>
              취소
            </KButton>
            <KButton className="text-down" variant="ghost" onClick={onClickConfirmDelete}>
              삭제하기
            </KButton>
          </KDialogFooter>
        </KDialogContent>
      </KDialog>
    </li>
  );
};

const MemoizedTradeListItem = memo(TradeListItem);
MemoizedTradeListItem.displayName = "TradeListItem";

export default MemoizedTradeListItem;
