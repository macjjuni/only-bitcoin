"use client";

import { memo, useMemo } from "react";
import { calcPercentage, getNextHalvingData, useBlockStore } from "@/entities/block";
import { calcDate } from "@/shared/lib/date";
import { useMounted } from "@/shared/lib/hooks";

interface HalvingProgressBarProps {
  className?: string;
  /** SSR 로 미리 조회한 블록 높이. 소켓이 붙기 전까지의 표시값이다. */
  initialBlockHeight: number;
}

const HalvingProgressBar = ({ className = "", initialBlockHeight }: HalvingProgressBarProps) => {
  // region [Hooks]
  const isMount = useMounted();
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
  const restBlockCount = useMemo(
    () => Math.max(nextHalvingData.blockHeight - currentBlockHeight, 0),
    [nextHalvingData, currentBlockHeight],
  );
  const expectNextHalvingDate = useMemo(() => {
    if (!isMount) return "YYYY.MM.DD";
    // eslint-disable-next-line react-hooks/purity
    return calcDate(Date.now(), restBlockCount * 10, "minute", "YYYY.MM.DD");
  }, [restBlockCount, isMount]);
  // endregion

  return (
    <div className={`flex flex-col gap-2 ${className}`}>
      <div className="flex items-center justify-between text-sm">
        <span className="font-bold">현재 반감기 진행률</span>
        <span className="font-number font-bold text-[#F7931A]">{halvingPercent}%</span>
      </div>

      <div
        className="relative h-3.5 w-full overflow-hidden rounded-full bg-black/10 dark:bg-white/15"
        role="progressbar"
        aria-valuenow={halvingPercent}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label="현재 반감기 진행률"
      >
        <div
          className="absolute inset-y-0 left-0 rounded-full bg-[#F7931A] transition-[width] duration-500"
          style={{ width: `${halvingPercent}%` }}
        />
      </div>

      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 font-number text-xs opacity-70">
        <span>현재 {currentBlockHeight.toLocaleString()} 블록</span>
        <span>다음 반감기까지 {restBlockCount.toLocaleString()} 블록</span>
        <span>예상일 {expectNextHalvingDate}</span>
      </div>
    </div>
  );
};

const MemoizedHalvingProgressBar = memo(HalvingProgressBar);
MemoizedHalvingProgressBar.displayName = "HalvingProgressBar";

export default MemoizedHalvingProgressBar;
