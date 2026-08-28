"use client";

import { memo, useMemo } from "react";
import { calcPercentage, getNextHalvingData, useBlockStore } from "@/entities/block";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui";
import HalvingProgressBar from "@/views/blocks/ui/HalvingProgressBar";

interface HalvingChartCardProps {
  /** SSR 로 미리 조회한 블록 높이 */
  initialBlockHeight: number;
}

const HalvingChartCard = ({ initialBlockHeight }: HalvingChartCardProps) => {
  // region [Hooks]
  const storeBlockHeight = useBlockStore((state) => state.blockData[0]?.height ?? 0);
  const currentBlockHeight = storeBlockHeight || initialBlockHeight;
  const nextHalvingData = useMemo(
    () => getNextHalvingData(currentBlockHeight),
    [currentBlockHeight],
  );
  const halvingPercent = useMemo(
    () => calcPercentage(nextHalvingData.blockHeight, currentBlockHeight),
    [nextHalvingData, currentBlockHeight],
  );
  // endregion

  return (
    <Card>
      <CardHeader className="!space-y-0 !pb-0 flex-row items-center justify-between">
        <CardTitle className="text-[18px] font-bold">반감기 현황</CardTitle>
        <span className="font-number font-bold text-bitcoin">{halvingPercent}%</span>
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
