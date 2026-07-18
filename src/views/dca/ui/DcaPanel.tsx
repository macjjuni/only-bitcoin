"use client";

import { memo, useState } from "react";
import { type TradeRecord, useDcaFormStore } from "@/entities/dca";
import { useMounted } from "@/shared/lib/hooks";
import { SegmentedControl } from "@/shared/ui";
import DcaHoldingsChart from "./DcaHoldingsChart";
import DcaSummary from "./DcaSummary";
import TradeFormDialog from "./TradeFormDialog";
import TradeList from "./TradeList";

type DcaTabType = "summary" | "chart";

const tabOptions: Array<{ label: string; value: DcaTabType }> = [
  { label: "요약", value: "summary" },
  { label: "차트", value: "chart" },
];

const DcaPanel = () => {
  // region [Hooks]
  const openForm = useDcaFormStore((state) => state.openForm);
  const isMounted = useMounted();
  const [activeTab, setActiveTab] = useState<DcaTabType>("summary");
  // endregion

  // region [Events]
  const onClickEditRecord = (record: TradeRecord) => {
    openForm(record);
  };

  const onClickTab = (tab: DcaTabType) => {
    setActiveTab(tab);
  };
  // endregion

  if (!isMounted) {
    return null;
  }

  return (
    <div className="flex flex-col gap-3">
      <SegmentedControl options={tabOptions} value={activeTab} onChange={onClickTab} />

      {activeTab === "summary" ? <DcaSummary /> : <DcaHoldingsChart />}

      <TradeList onClickEdit={onClickEditRecord} />
      <TradeFormDialog />
    </div>
  );
};

const MemoizedDcaPanel = memo(DcaPanel);
MemoizedDcaPanel.displayName = "DcaPanel";

export default MemoizedDcaPanel;
