"use client";

import { memo } from "react";

interface AreaBucketTabsProps {
  availableAreas: number[];
  selectedAreaInSquareMeter: number | null;
  onSelectArea: (areaInSquareMeter: number) => void;
}

/**
 * 평형 선택 칩.
 *
 * 단지가 실제로 보유한 평형만 노출한다. 평형 수가 단지마다 2~9개로 달라
 * 균등 분할하는 SegmentedControl 대신 가로 스크롤 칩을 씀.
 */
const AreaBucketTabs = ({
  availableAreas,
  selectedAreaInSquareMeter,
  onSelectArea,
}: AreaBucketTabsProps) => {
  if (availableAreas.length === 0) {
    return null;
  }

  return (
    <div className="flex gap-1.5 overflow-x-auto pb-2.5 pl-4 -mx-4 mb-2 font-number scrollbar-none">
      {availableAreas.map((areaInSquareMeter, index) => {
        const isSelected = areaInSquareMeter === selectedAreaInSquareMeter;

        return (
          <button
            key={areaInSquareMeter}
            type="button"
            onClick={() => onSelectArea(areaInSquareMeter)}
            className={[
              "shrink-0 rounded-full px-3 h-8 text-xs font-bold transition-colors",
              isSelected
                ? "bg-bitcoin text-white"
                : "bg-neutral-200/70 text-muted-foreground dark:bg-neutral-800",
              index === availableAreas.length - 1 ? "mr-4" : "",
            ].join(" ")}
          >
            {areaInSquareMeter}㎡
          </button>
        );
      })}
    </div>
  );
};

const MemoizedAreaBucketTabs = memo(AreaBucketTabs);
MemoizedAreaBucketTabs.displayName = "AreaBucketTabs";

export default MemoizedAreaBucketTabs;
