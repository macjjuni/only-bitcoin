"use client";

import { KCard, KCardContent, KCardHeader, KCardTitle } from "kku-ui";
import { memo } from "react";
import HalvingProgressBar from "@/views/blocks/ui/HalvingProgressBar";

const HalvingChartCard = () => {
  return (
    <KCard className="glass-surface">
      <KCardHeader>
        <KCardTitle className="text-[18px] font-bold">반감기 현황</KCardTitle>
      </KCardHeader>

      <KCardContent>
        <HalvingProgressBar />
      </KCardContent>
    </KCard>
  );
};

const MemoizedHalvingChartCard = memo(HalvingChartCard);
MemoizedHalvingChartCard.displayName = "HalvingChartCard";

export default MemoizedHalvingChartCard;
