import { memo, useCallback, useEffect, useMemo } from "react";
import { useLottie } from "lottie-react";
import useStore from "@/shared/stores/store";
import { comma } from "@/shared/utils/string";
import { calcPercentage, getNextHalvingData } from "@/shared/utils/calculate";
import blockLottieJson from "@/shared/assets/lottie/blocks.json";
import { calcDate } from "@/shared/lib/date";

const totalSegments = 25 as const;


const BlockHalvingCard = () => {

  // region [Hooks]
  const { View, animationItem } = useLottie({ animationData: blockLottieJson, loop: true });

  const blockData = useStore((state) => state.blockData);
  const recentBlockData = useMemo(() => blockData[0], [blockData]);
  const nextHalvingData = useMemo(() => getNextHalvingData(recentBlockData.height), [recentBlockData]);
  const halvingPercent = useMemo(() => calcPercentage(nextHalvingData?.blockHeight, recentBlockData.height), [nextHalvingData, recentBlockData]);
  const restBlockCount = useMemo(() => (nextHalvingData.blockHeight - blockData[0].height), [nextHalvingData, blockData]);
  const expectNextHalvingDate = useMemo(() => calcDate(Date.now(), restBlockCount * 10, "minute", "YYYY.MM.DD"), [restBlockCount]);
  // endregion


  // region [Render Logic]
  const currentBlockIndex = Math.floor(halvingPercent / 4);

  const renderSegments = useMemo(() => {
    return Array.from({ length: totalSegments }, (_, index) => {
      const isFilled = index < currentBlockIndex;
      const isActive = index === currentBlockIndex;

      const className = [
        "inline-flex h-full w-[calc((100%-50px)/25)] mr-0.5 -translate-x-1 -skew-x-[24deg] transition-all duration-300",
        isFilled ? "bg-current z-[1]" : "bg-transparent", // 채워진 상태
        isActive ? "!bg-current animate-blink-gold z-[2]" : "" // 현재 진행 상태
      ].filter(Boolean).join(" ");

      return <div key={index} className={className} />;
    });
  }, [currentBlockIndex, currentBlockIndex]);
  // endregion

  // region [Privates]
  const initializeLottieSpeed = useCallback(() => {
    if (!animationItem) { return; }
    animationItem?.setSpeed(0.48);
  }, [animationItem]);
  // endregion


  // region [Life Cycles]
  useEffect(initializeLottieSpeed, [View]);
  // endregion


  return (
    <div className="flex flex-col justify-between gap-2 p-0 mt-2 border-none">

      {/* .block-halving-card__header */}
      <div className="flex justify-between items-end">
        <h2 className="text-lg font-bold">Bitcoin Halving</h2>
      </div>

      {/* .block-halving-card__content */}
      <div className="flex justify-between items-center gap-4">
        {/* .block-halving-card__gauge */}
        <div className="relative w-[70%] h-8 p-0.5 border-2 border-current rounded-sm whitespace-nowrap overflow-hidden">
          {/* Edge Spans */}
          <span className="absolute top-0 left-0 w-[2px] h-full bg-background z-10" />

          <div className="inline-flex h-full w-[calc((100%-50px)/25)] mr-0.5 -translate-x-1 -skew-x-[24deg] bg-current z-0" />

          {renderSegments}

          <span className="absolute top-0 right-0 w-[2px] h-full bg-background z-10" />
        </div>

        <span className="text-xl font-bold pr-1 text-current drop-shadow-[0_0_10px_rgba(var(--font-rgb),0.5)]">
          {halvingPercent}%
        </span>
      </div>

      {/* .block-halving-card__info */}
      <div className="flex justify-between items-center gap-3 pr-1">
        <div className="relative w-14 h-14">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-20 h-20">
            {View}
          </div>
        </div>

        {/* Info Items */}
        <div className="flex flex-col gap-1">
          <span className="text-[12px] opacity-70">Current</span>
          <span className="font-number font-bold text-base">{comma(recentBlockData.height)}</span>
        </div>

        <div className="w-px h-9 bg-current" />

        <div className="flex flex-col gap-1">
          <span className="text-[12px] opacity-70">Remaining</span>
          <span className="font-number font-bold text-base">
            {comma(nextHalvingData.blockHeight - recentBlockData.height)}
          </span>
        </div>

        <div className="w-px h-9 bg-current" />

        <div className="flex flex-col gap-1">
          <span className="text-[12px] opacity-70">Estimated Date</span>
          <span className="font-number font-bold text-base">{expectNextHalvingDate}</span>
        </div>
      </div>
    </div>
  );
};

const MemoizedBlockHalvingCard = memo(BlockHalvingCard);
MemoizedBlockHalvingCard.displayName = "BlockHalvingCard";
BlockHalvingCard.display = "BlockHalvingCard";

export default MemoizedBlockHalvingCard;