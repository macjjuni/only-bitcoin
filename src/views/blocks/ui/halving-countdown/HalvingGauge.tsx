"use client";

import { memo } from "react";

/** 진행 위치를 가늠할 기준 눈금 (%) */
const TICKS = [25, 50, 75] as const;

interface HalvingGaugeProps {
  /** 진행률 (0~100) */
  percent: number;
}

const HalvingGauge = ({ percent }: HalvingGaugeProps) => {
  // region [Hooks]
  const clampedPercent = Math.min(Math.max(percent, 0), 100);
  // endregion

  return (
    <div
      className="relative mt-2.5 h-3.5 w-full overflow-hidden rounded-full bg-black/25 shadow-[inset_0_1px_3px_rgba(0,0,0,0.5)]"
      role="progressbar"
      aria-valuenow={clampedPercent}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label="현재 반감기 진행률"
    >
      <div
        className="absolute inset-y-0 left-0 overflow-hidden rounded-full bg-gradient-to-r from-bitcoin/50 via-bitcoin to-[#FFB74D] shadow-[0_0_16px_rgba(247,147,26,0.85)] transition-[width] duration-700 ease-out"
        style={{ width: `${clampedPercent}%` }}
      >
        {/* 채워진 구간을 훑고 지나가는 하이라이트 */}
        <span
          className="absolute inset-y-0 left-0 w-1/2 bg-gradient-to-r from-transparent via-white/50 to-transparent animate-shimmer motion-reduce:hidden"
          aria-hidden="true"
        />

        {/* 진행 선두의 발광 */}
        <span
          className="absolute inset-y-0 right-0 w-1.5 rounded-full bg-white/90 blur-[2px] animate-gauge-pulse motion-reduce:animate-none"
          aria-hidden="true"
        />
      </div>

      {/* 눈금은 채워진 구간 위에도 보이도록 마지막에 겹친다. */}
      {TICKS.map((tick) => (
        <span
          key={tick}
          className="absolute inset-y-0 w-px bg-white/20"
          style={{ left: `${tick}%` }}
          aria-hidden="true"
        />
      ))}
    </div>
  );
};

const MemoizedHalvingGauge = memo(HalvingGauge);
MemoizedHalvingGauge.displayName = "HalvingGauge";

export default MemoizedHalvingGauge;
