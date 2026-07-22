"use client";

import { memo, useMemo } from "react";

const DIGITS = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9] as const;

interface OdometerNumberProps {
  className?: string;
  /** 표시할 값 */
  value: number;
  /** 앞자리를 0 으로 채울 최소 자릿수 */
  minLength?: number;
}

interface OdometerDigitProps {
  digit: number;
}

/**
 * 0~9 를 세로로 쌓아두고 위치만 옮겨 굴러가는 한 자리.
 * 숫자를 교체하지 않고 이동시키므로 자릿수가 바뀌어도 흐름이 끊기지 않는다.
 */
const OdometerDigit = ({ digit }: OdometerDigitProps) => (
  <span className="relative block h-[1.1em] w-[0.62em] overflow-hidden">
    <span
      className="absolute inset-x-0 top-0 flex flex-col transition-transform duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] will-change-transform"
      style={{ transform: `translateY(-${digit * 10}%)` }}
    >
      {DIGITS.map((item) => (
        <span key={item} className="flex h-[1.1em] items-center justify-center">
          {item}
        </span>
      ))}
    </span>
  </span>
);

const OdometerNumber = ({ className = "", value, minLength = 2 }: OdometerNumberProps) => {
  // region [Hooks]
  const digits = useMemo(() => {
    const padded = String(Math.max(Math.trunc(value), 0)).padStart(minLength, "0");
    return padded.split("").map(Number);
  }, [value, minLength]);
  // endregion

  return (
    <span className={`inline-flex font-number tabular-nums ${className}`}>
      {/* 굴러가는 자릿수는 스크린 리더에 무의미하므로 숫자 값만 따로 읽힌다. */}
      <span className="sr-only">{value}</span>

      <span className="inline-flex" aria-hidden="true">
        {digits.map((digit, index) => (
          // 자릿수는 위치가 곧 정체성인 고정 슬롯이라 인덱스를 키로 쓴다.
          <OdometerDigit key={index} digit={digit} />
        ))}
      </span>
    </span>
  );
};

const MemoizedOdometerNumber = memo(OdometerNumber);
MemoizedOdometerNumber.displayName = "OdometerNumber";

export default MemoizedOdometerNumber;
