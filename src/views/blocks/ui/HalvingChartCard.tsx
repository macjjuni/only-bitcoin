"use client";

import { memo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui";
import HalvingProgressBar from "@/views/blocks/ui/HalvingProgressBar";

interface HalvingChartCardProps {
  /** SSR 로 미리 조회한 블록 높이 */
  initialBlockHeight: number;
}

const HalvingChartCard = ({ initialBlockHeight }: HalvingChartCardProps) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-[18px] font-bold">반감기 현황</CardTitle>
      </CardHeader>

      <CardContent>
        <HalvingProgressBar initialBlockHeight={initialBlockHeight} />
      </CardContent>
    </Card>
  );
};

const MemoizedHalvingChartCard = memo(HalvingChartCard);
MemoizedHalvingChartCard.displayName = "HalvingChartCard";

export default MemoizedHalvingChartCard;
