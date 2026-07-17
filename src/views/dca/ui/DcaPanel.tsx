"use client";

import { memo } from "react";
import { type PurchaseRecord, useDcaFormStore } from "@/entities/dca";
import { useMounted } from "@/shared/lib/hooks";
import DcaSummary from "./DcaSummary";
import PurchaseFormDialog from "./PurchaseFormDialog";
import PurchaseList from "./PurchaseList";

const DcaPanel = () => {
  // region [Hooks]
  const openForm = useDcaFormStore((state) => state.openForm);
  const isMounted = useMounted();
  // endregion

  // region [Events]
  const onClickEditRecord = (record: PurchaseRecord) => {
    openForm(record);
  };
  // endregion

  if (!isMounted) {
    return null;
  }

  return (
    <div className="flex flex-col gap-3">
      <DcaSummary />
      <PurchaseList onClickEdit={onClickEditRecord} />
      <PurchaseFormDialog />
    </div>
  );
};

const MemoizedDcaPanel = memo(DcaPanel);
MemoizedDcaPanel.displayName = "DcaPanel";

export default MemoizedDcaPanel;
