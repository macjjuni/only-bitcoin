"use client";

import { memo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui";
import HalvingProgressBar from "@/views/blocks/ui/HalvingProgressBar";

const HalvingChartCard = () => {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-[18px] font-bold">반감기 현황</CardTitle>
      </CardHeader>

      <CardContent>
        <HalvingProgressBar />
      </CardContent>
    </Card>
  );
};

const MemoizedHalvingChartCard = memo(HalvingChartCard);
MemoizedHalvingChartCard.displayName = "HalvingChartCard";

export default MemoizedHalvingChartCard;
