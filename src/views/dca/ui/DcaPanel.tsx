"use client";

import { memo, useState } from "react";
import { type TradeRecord, useDcaFormStore } from "@/entities/dca";
import { useMounted } from "@/shared/lib/hooks";
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
      <div className="grid grid-cols-2 gap-1 rounded-lg bg-neutral-200/70 p-1 dark:bg-neutral-800">
        {tabOptions.map((option) => (
          <button
            key={option.value}
            type="button"
            className={`h-9 rounded-md text-sm font-default font-bold transition-colors active:scale-[0.97] ${
              activeTab === option.value
                ? "bg-white shadow-sm dark:bg-neutral-600 text-foreground"
                : "text-muted-foreground"
            }`}
            onClick={() => onClickTab(option.value)}
          >
            {option.label}
          </button>
        ))}
      </div>

      {activeTab === "summary" ? <DcaSummary /> : <DcaHoldingsChart />}

      <TradeList onClickEdit={onClickEditRecord} />
      <TradeFormDialog />
    </div>
  );
};

const MemoizedDcaPanel = memo(DcaPanel);
MemoizedDcaPanel.displayName = "DcaPanel";

export default MemoizedDcaPanel;
