"use client";

import { KDialog, KDialogContent, KDialogHeader, KDialogOverlay, KDialogTitle } from "kku-ui";
import { memo } from "react";
import { useDcaFormStore } from "@/entities/dca";
import TradeForm from "./TradeForm";

const TradeFormDialog = () => {
  // region [Hooks]
  const isFormOpen = useDcaFormStore((state) => state.isFormOpen);
  const editRecord = useDcaFormStore((state) => state.editRecord);
  const closeForm = useDcaFormStore((state) => state.closeForm);
  // endregion

  // region [Events]
  const onOpenChangeDialog = (open: boolean) => {
    if (!open) {
      closeForm();
    }
  };

  // 다이얼로그 오픈 시 날짜 input 에 자동 포커스되면 네이티브 달력이 열리므로 방지한다.
  const onOpenAutoFocusDialog = (e: Event) => {
    e.preventDefault();
  };
  // endregion

  return (
    <KDialog open={isFormOpen} onOpenChange={onOpenChangeDialog} blur={2} size="sm">
      <KDialogOverlay />
      <KDialogContent className="!top-[44%]" onOpenAutoFocus={onOpenAutoFocusDialog}>
        <KDialogHeader>
          <KDialogTitle>
            <strong>{editRecord ? "기록 수정" : "기록 추가"}</strong>
          </KDialogTitle>
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
