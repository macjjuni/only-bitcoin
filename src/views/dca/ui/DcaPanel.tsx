"use client";

import { memo } from "react";
import { type TradeRecord, useDcaFormStore } from "@/entities/dca";
import { useMounted } from "@/shared/lib/hooks";
import DcaSummary from "./DcaSummary";
import TradeFormDialog from "./TradeFormDialog";
import TradeList from "./TradeList";

const DcaPanel = () => {
  // region [Hooks]
  const openForm = useDcaFormStore((state) => state.openForm);
  const isMounted = useMounted();
  // endregion

  // region [Events]
  const onClickEditRecord = (record: TradeRecord) => {
    openForm(record);
  };
  // endregion

  if (!isMounted) {
    return null;
  }

  return (
    <div className="flex flex-col gap-3">
      <DcaSummary />
      <TradeList onClickEdit={onClickEditRecord} />
      <TradeFormDialog />
    </div>
  );
};

const MemoizedDcaPanel = memo(DcaPanel);
MemoizedDcaPanel.displayName = "DcaPanel";

export default MemoizedDcaPanel;
