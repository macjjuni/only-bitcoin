"use client";

import { Fragment, memo, useMemo } from "react";
import type { FeesTypes } from "@/entities/block";
import { useBlockStore } from "@/entities/block";
import { CountText } from "@/shared/ui";

interface RealtimeTxFeesProps {
  /** SSR 로 미리 조회한 수수료. 소켓이 붙기 전까지의 표시값이다. */
  initialFees: FeesTypes;
}

const RealtimeTxFees = ({ initialFees }: RealtimeTxFeesProps) => {
  // region [Hooks]
  const storeFees = useBlockStore((state) => state.fees);

  // 소켓이 값을 채우기 전(= 서버 렌더링 및 첫 페인트)에는 SSR 값으로 대체한다.
  const fees = storeFees.fastestFee ? storeFees : initialFees;

  const feeDataList = useMemo(
    () => [
      { label: "최하위 순위", value: fees.economyFee },
      { label: "낮은 우선 순위", value: fees.hourFee },
      { label: "중간 우선 순위", value: fees.halfHourFee },
      { label: "높은 우선 순위", value: fees.fastestFee },
    ],
    [fees],
  );
  // endregion

  return (
    <div className="flex flex-col justify-between gap-3 border-none">
      <div className="flex justify-between items-end">
        <h2 className="text-[18px] font-bold">실시간 트랜잭션 수수료</h2>
      </div>

      <div className="flex justify-between items-center gap-2 pr-1">
        {feeDataList.map(({ label, value }, idx) => (
          <Fragment key={label}>
            <div className="flex flex-col w-[22%]">
              <span className="text-[13px] opacity-80 tracking-[-1px] whitespace-nowrap">
                {label}
              </span>
              <span className="font-number font-bold text-lg">
                <CountText value={value} decimals={1} />
                <span className="text-xs font-normal pl-[2px] tracking-[-0.5px]">sat/vB</span>
              </span>
            </div>

            {/* Divider */}
            {idx !== feeDataList.length - 1 && <div className="w-px h-9 bg-current opacity-70" />}
          </Fragment>
        ))}
      </div>
    </div>
  );
};

const MemoizedRealtimeTxFees = memo(RealtimeTxFees);
MemoizedRealtimeTxFees.displayName = "RealtimeTxFees";

export default MemoizedRealtimeTxFees;
