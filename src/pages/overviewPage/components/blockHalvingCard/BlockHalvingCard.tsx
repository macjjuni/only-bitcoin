import { CSSProperties, memo, useCallback, useEffect, useMemo, useState } from "react";
import { useLottie } from "lottie-react";
import useStore from "@/shared/stores/store";
import { comma } from "@/shared/utils/string";
import blockLottieJson from "@/shared/assets/lottie/blocks.json";
import { calcPercentage, getNextHalvingData } from "@/shared/utils/common";
import { HorizontalCard } from "../../../../components";
import "./BlockHalvingCard.scss";


const BlockHalvingCard = () => {

  // region [Hooks]

  const blockData = useStore(state => state.blockData);
  const [ballLeftSize, setBallLeftSize] = useState<string>('0');
  const { View, animationItem } = useLottie({ animationData: blockLottieJson, loop: true });
  const recentBlockData = useMemo(() => (blockData[0]), [blockData]);
  const nextHalvingData = useMemo(() => (getNextHalvingData(recentBlockData.height)), [recentBlockData]);
  const halvingPercent = useMemo(
    () => calcPercentage(nextHalvingData?.blockHeight, recentBlockData.height), [nextHalvingData, recentBlockData]);

  // endregion


  // region [Privates]

  const initializeProgressBallLeftSize = useCallback(() => {
    setBallLeftSize(`calc(${Math.ceil(halvingPercent)}%)`);
  }, [halvingPercent]);

  const initializeLottieSpeed = useCallback(() => {
    if (!animationItem) { return; }
    animationItem?.setSpeed(0.4);
  }, [animationItem])

  // endregion


  // region [Styles]

  const progressStyle: CSSProperties = useMemo(() => ({ width: ballLeftSize }), [ballLeftSize]);

  // endregion


  // region

  useEffect(() => {
    initializeProgressBallLeftSize();
  }, [halvingPercent]);
  useEffect(() => {
    initializeLottieSpeed();
  }, [animationItem]);

  // endregion


  return (
    <HorizontalCard className="block-card" rows={1}>

      <h2 className="block-card__title">Next Halving</h2>

      <div className="block-card__guage__area">
        <div className="block-card__guage__area__bar__area">

          <div className="block-card__guage__area__bar">
            <div className="block-card__guage__area__bar__ball" style={progressStyle} />
          </div>

          <div className="block-card__guage__area__percent__area">
            <span className="block-card__guage__area__percent__area__text">
              {halvingPercent}%
            </span>
          </div>

        </div>

        <div className="block-card__guage__area__remaining">
          <div className="block-card__guage__area__remaining__lottie">{View}</div>
          <span className="block-card__guage__area__remaining__text">
            {comma(recentBlockData.height)} | {comma(nextHalvingData.blockHeight - recentBlockData.height)}
          </span>
          remaining
        </div>

      </div>

    </HorizontalCard>
  );
};

export default memo(BlockHalvingCard);
