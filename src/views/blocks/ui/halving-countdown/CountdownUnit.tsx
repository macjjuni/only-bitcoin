"use client";

import { memo } from "react";
import OdometerNumber from "./OdometerNumber";

/** 이 값 미만이면 임박한 것으로 보고 강조한다. (한 자릿수) */
const DEFAULT_LOW_THRESHOLD = 10;

interface CountdownUnitProps {
  /** 단위 값 (일/시/분/초) */
  value: number;
  /** 단위 라벨 */
  label: string;
  /** 앞자리를 0 으로 채울 최소 자릿수 */
  minLength?: number;
  /** 강조로 전환되는 기준값 */
  lowThreshold?: number;
}

const CountdownUnit = ({
  value,
  label,
  minLength = 2,
  lowThreshold = DEFAULT_LOW_THRESHOLD,
}: CountdownUnitProps) => {
  // region [Hooks]
  const isLow = value < lowThreshold;
  // endregion

  return (
    // 라벨을 카드 안에 넣어야 숫자와 한 덩어리로 읽힌다.
    <div className="glass-card flex flex-1 flex-col items-center gap-1 rounded-2xl px-1 py-3">
      <OdometerNumber
        value={value}
        minLength={minLength}
        className={[
          "justify-center text-[26px] font-bold leading-none transition-colors duration-500",
          isLow
            ? "text-bitcoin drop-shadow-[0_0_12px_rgba(247,147,26,0.65)]"
            : "text-white drop-shadow-[0_0_10px_rgba(255,255,255,0.25)]",
        ].join(" ")}
      />

      <span className="text-[11px] font-semibold tracking-[0.14em] text-white/65">{label}</span>
    </div>
  );
};

const MemoizedCountdownUnit = memo(CountdownUnit);
MemoizedCountdownUnit.displayName = "CountdownUnit";

export default MemoizedCountdownUnit;
