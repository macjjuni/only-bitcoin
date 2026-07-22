"use client";

import {
  KDialog,
  KDialogContent,
  KDialogDescription,
  KDialogHeader,
  KDialogOverlay,
  KDialogTitle,
} from "kku-ui";
import { memo, useRef } from "react";
import { useDcaFormStore } from "@/entities/dca";
import TradeForm from "./TradeForm";

const TradeFormDialog = () => {
  // region [Hooks]
  const isFormOpen = useDcaFormStore((state) => state.isFormOpen);
  const editRecord = useDcaFormStore((state) => state.editRecord);
  const closeForm = useDcaFormStore((state) => state.closeForm);
  const contentRef = useRef<HTMLDivElement>(null);
  // endregion

  // region [Events]
  const onOpenChangeDialog = (open: boolean) => {
    if (!open) {
      closeForm();
    }
  };

  /**
   * 다이얼로그 오픈 시 날짜 input 에 자동 포커스되면 네이티브 달력이 열리므로 방지한다.
   * 다만 포커스를 트리거 버튼에 남겨두면 배경 트리에 걸린 aria-hidden 안에 포커스가 갇히므로,
   * 다이얼로그 컨테이너(tabIndex=-1)로 포커스를 옮겨준다.
   */
  const onOpenAutoFocusDialog = (e: Event) => {
    e.preventDefault();
    contentRef.current?.focus();
  };
  // endregion

  return (
    <KDialog open={isFormOpen} onOpenChange={onOpenChangeDialog} blur={2} size="sm">
      <KDialogOverlay />
      <KDialogContent
        ref={contentRef}
        className="!top-[44%]"
        onOpenAutoFocus={onOpenAutoFocusDialog}
      >
        <KDialogHeader>
          <KDialogTitle>
            <strong>{editRecord ? "기록 수정" : "기록 추가"}</strong>
          </KDialogTitle>
          <KDialogDescription className="sr-only">
            매수/매도 구분, 날짜, 개수, 단가를 입력해 매매 기록을 저장합니다.
          </KDialogDescription>
        </KDialogHeader>
        {isFormOpen && (
          <TradeForm key={editRecord?.id ?? "new"} editRecord={editRecord} onClose={closeForm} />
        )}
      </KDialogContent>
    </KDialog>
  );
};

const MemoizedTradeFormDialog = memo(TradeFormDialog);
MemoizedTradeFormDialog.displayName = "TradeFormDialog";

export default MemoizedTradeFormDialog;
