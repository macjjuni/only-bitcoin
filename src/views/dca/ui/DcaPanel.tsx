"use client";

import { KButton } from "kku-ui";
import { Plus } from "lucide-react";
import { memo, useState } from "react";
import { useMounted } from "@/shared/lib/hooks";
import type { PurchaseRecord } from "../model/dcaStore";
import DcaSummary from "./DcaSummary";
import PurchaseForm from "./PurchaseForm";
import PurchaseList from "./PurchaseList";

const DcaPanel = () => {
  // region [Hooks]
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editRecord, setEditRecord] = useState<PurchaseRecord | null>(null);
  const isMounted = useMounted();
  // endregion

  // region [Events]
  const onClickOpenForm = () => {
    setEditRecord(null);
    setIsFormOpen(true);
  };

  const onClickEditRecord = (record: PurchaseRecord) => {
    setEditRecord(record);
    setIsFormOpen(true);
  };

  const onCloseForm = () => {
    setEditRecord(null);
    setIsFormOpen(false);
  };
  // endregion

  if (!isMounted) {
    return null;
  }

  return (
    <div className="flex flex-col gap-3">
      <DcaSummary />

      {isFormOpen ? (
        <PurchaseForm key={editRecord?.id ?? "new"} editRecord={editRecord} onClose={onCloseForm} />
      ) : (
        <KButton className="w-full" onClick={onClickOpenForm}>
          <Plus size={16} />
          매수 기록 추가
        </KButton>
      )}

      <PurchaseList onClickEdit={onClickEditRecord} />
    </div>
  );
};

const MemoizedDcaPanel = memo(DcaPanel);
MemoizedDcaPanel.displayName = "DcaPanel";

export default MemoizedDcaPanel;
