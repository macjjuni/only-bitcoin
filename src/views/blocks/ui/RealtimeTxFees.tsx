"use client";

import { Fragment, memo, useMemo } from "react";
import type { FeesTypes, MempoolInfoTypes } from "@/entities/block";
import { useBlockStore } from "@/entities/block";
import { CountText } from "@/shared/ui";

/** 블록 하나가 담을 수 있는 vsize(vB). 대기 물량을 블록 수로 환산하는 기준 */
const BLOCK_VSIZE = 1_000_000;

/** 혼잡도 단계. 대기 물량(블록 수) 상한 기준으로 앞에서부터 매칭. */
const CONGESTION_LEVELS = [
  {
    maxBlocks: 2,
    label: "원활",
    dotClassName: "bg-emerald-500",
    textClassName: "text-emerald-500",
  },
  { maxBlocks: 10, label: "보통", dotClassName: "bg-amber-500", textClassName: "text-amber-500" },
  {
    maxBlocks: Number.POSITIVE_INFINITY,
    label: "혼잡",
    dotClassName: "bg-red-500",
    textClassName: "text-red-500",
  },
] as const;

interface RealtimeTxFeesProps {
  /** SSR 로 미리 조회한 수수료. 소켓이 붙기 전까지의 표시값 */
  initialFees: FeesTypes;
  /** SSR 로 미리 조회한 멤풀 현황. 소켓이 붙기 전까지의 표시 */
  initialMempoolInfo: MempoolInfoTypes;
}

const RealtimeTxFees = ({ initialFees, initialMempoolInfo }: RealtimeTxFeesProps) => {
  // region [Hooks]
  const storeFees = useBlockStore((state) => state.fees);
  const storeMempoolInfo = useBlockStore((state) => state.mempoolInfo);
  const fees = useMemo(
    () => (storeFees.fastestFee ? storeFees : initialFees),
    [storeFees, initialFees],
  );
  const mempoolInfo = useMemo(
    () => (storeMempoolInfo.vsize ? storeMempoolInfo : initialMempoolInfo),
    [storeMempoolInfo, initialMempoolInfo],
  );

  const feeDataList = useMemo(
    () => [
      { label: "최하위 순위", value: fees.economyFee },
      { label: "낮은 우선 순위", value: fees.hourFee },
      { label: "중간 우선 순위", value: fees.halfHourFee },
      { label: "높은 우선 순위", value: fees.fastestFee },
    ],
    [fees],
  );

  const congestion = useMemo(() => {
    if (!mempoolInfo.vsize) return null;

    const backlogBlocks = mempoolInfo.vsize / BLOCK_VSIZE;
    const level =
      CONGESTION_LEVELS.find(({ maxBlocks }) => backlogBlocks < maxBlocks) ??
      CONGESTION_LEVELS[CONGESTION_LEVELS.length - 1];

    return { ...level, backlogBlocks };
  }, [mempoolInfo]);
  // endregion

  return (
    <div className="flex flex-col justify-between gap-3 border-none">
      <div className="flex justify-between items-center">
        <h2 className="text-[18px] font-bold">실시간 트랜잭션 수수료</h2>

        {congestion && (
          <div className="flex items-center gap-1.5 text-[13px]">
            <span
              aria-hidden="true"
              className="relative inline-block w-3 h-3 animate-[spin_1.6s_linear_infinite] motion-reduce:animate-none"
            >
              <span
                className={`absolute top-0 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full ${congestion.dotClassName}`}
              />
              <span
                className={`absolute bottom-0 left-0 w-1 h-1 rounded-full opacity-70 ${congestion.dotClassName}`}
              />
              <span
                className={`absolute bottom-0 right-0 w-1 h-1 rounded-full opacity-40 ${congestion.dotClassName}`}
              />
            </span>
            <span className="text-sm tracking-[-0.5px] whitespace-nowrap opacity-80">
              {congestion.label} · 약{" "}
              <strong className={`${congestion.textClassName} mr-1`}>
                {Math.max(1, Math.round(congestion.backlogBlocks))}
              </strong>
              블록 대기
            </span>
          </div>
        )}
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
