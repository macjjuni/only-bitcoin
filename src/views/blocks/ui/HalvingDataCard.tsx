"use client";

import { memo, useMemo } from "react";
import { blockHalvingData, useBlockStore } from "@/entities/block";
import { Card, CollapseSection } from "@/shared/ui";

interface HalvingDataCardProps {
  /** SSR 로 미리 조회한 블록 높이. 다음 반감기 행 하이라이트에 쓰인다. */
  initialBlockHeight: number;
}

const HalvingDataCard = ({ initialBlockHeight }: HalvingDataCardProps) => {
  // region [Hooks]
  const storeBlockHeight = useBlockStore((state) => state.blockData[0]?.height ?? 0);
  const currentBlockHeight = storeBlockHeight || initialBlockHeight;
  // endregion

  // region [Templates]
  const nextHalvingIndex = useMemo(
    () => blockHalvingData.findIndex(({ blockHeight }) => blockHeight > currentBlockHeight),
    [currentBlockHeight],
  );

  const HalvingDataList = useMemo(
    () => [
      {
        label: "No.",
        items: blockHalvingData.map(({ date }, idx) => ({ value: idx + 1, key: date })),
      },
      { label: "날짜", items: blockHalvingData.map(({ date }) => ({ value: date, key: date })) },
      {
        label: "블록 높이",
        items: blockHalvingData.map(({ date, blockHeight }) => ({ value: blockHeight, key: date })),
      },
      {
        label: "보상(단위: btc)",
        items: blockHalvingData.map(({ blockReward, date }) => ({ value: blockReward, key: date })),
      },
    ],
    [],
  );
  // endregion

  return (
    <Card className="w-full">
      <CollapseSection
        title={<h2 className="m-0 text-[18px] font-bold">반감기 정보</h2>}
        summaryClassName="p-4 text-[18px]"
        contentClassName="overflow-x-auto px-6 pb-6"
      >
        <ul className="flex flex-row">
          {HalvingDataList.map(({ label, items }) => (
            <div key={label} className="flex flex-col w-auto">
              {/* 헤더 레이블 */}
              <div className="whitespace-nowrap px-2 py-0.5 font-bold border-b border-border font-number">
                {label}
              </div>
              {/* 데이터 리스트 */}
              {items.map(({ value, key }, idx) => {
                const isActive = nextHalvingIndex === idx;
                const isLast = idx === items.length - 1;

                return (
                  <div
                    key={key}
                    className={[
                      "whitespace-nowrap px-1.5 py-0.5 font-number text-base transition-colors",
                      isLast ? "border-none" : "border-b border-border",
                      isActive ? "font-bold text-[#F7931A]" : "text-current",
                    ].join(" ")}
                  >
                    {value}
                  </div>
                );
              })}
            </div>
          ))}
        </ul>
      </CollapseSection>
    </Card>
  );
};

const MemoizedHalvingDataCard = memo(HalvingDataCard);
MemoizedHalvingDataCard.displayName = "HalvingDataCard";

export default MemoizedHalvingDataCard;
