import { memo, useCallback, useEffect, useMemo } from "react";
import { useLottie } from "lottie-react";
import useStore from "@/shared/stores/store";
import { comma } from "@/shared/utils/string";
import { calcPercentage, getNextHalvingData } from "@/shared/utils/calculate";
import blockLottieJson from "@/shared/assets/lottie/blocks.json";
import { HorizontalCard } from "@/components";
import "./BlockHalvingCard.scss";
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
    return Array.from({ length: totalSegments }, (_, index) => { // totalSegments: 25
      const isFilled = index < currentBlockIndex;
      const isActive = index === currentBlockIndex;

      let className = "halving-gauge__segment";
      if (isFilled) className += " filled";
      if (isActive) className += " active";

      return <div key={index} className={className} />;
    });
  }, [halvingPercent, currentBlockIndex]);
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
    <HorizontalCard className="block-halving-card" rows={1}>

      <div className="block-halving-card__header">
        <h2 className="block-halving-card__header__title">Bitcoin Halving</h2>
      </div>

      <div className="block-halving-card__content">
        <div className="block-halving-card__gauge">
          <span />
          {renderSegments}
          <span />
        </div>
        <span className="block-halving-card__gauge__percent">{halvingPercent}%</span>
      </div>

      <div className="block-halving-card__info">
        <div className="block-halving-card__info__lottie">{View}</div>
        <div className="block-halving-card__info__info-item">
          <span className="block-halving-card__info__info-item__label">Current</span>
          <span className="block-halving-card__info__info-item__value">{comma(recentBlockData.height)}</span>
        </div>
        <div className="block-halving-card__info__info-item__divider" />
        <div className="block-halving-card__info__info-item">
          <span className="block-halving-card__info__info-item__label">Remaining</span>
          <span className="block-halving-card__info__info-item__value">
            {comma(nextHalvingData.blockHeight - recentBlockData.height)}
          </span>
        </div>
        <div className="block-halving-card__info__info-item__divider" />
        <div className="block-halving-card__info__info-item">
          <span className="block-halving-card__info__info-item__label">Estimated Date</span>
          <span className="block-halving-card__info__info-item__value">
            {expectNextHalvingDate}
          </span>
        </div>
      </div>
    </HorizontalCard>
  );
};

const MemoizedBlockHalvingCard = memo(BlockHalvingCard);
MemoizedBlockHalvingCard.displayName = "BlockHalvingCard";
BlockHalvingCard.display = "BlockHalvingCard";

export default MemoizedBlockHalvingCard;