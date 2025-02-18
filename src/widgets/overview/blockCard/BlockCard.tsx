import { CSSProperties, memo, useMemo } from "react";
import { useLottie } from "lottie-react";
import HorizontalCard from "@/widgets/overview/card/horizontalCard/HorizontalCard";
import useStore from "@/shared/stores/store";
import { comma } from "@/shared/utils/string";
import "./BlockCard.scss";
import blockLottieJson from "@/shared/assets/lottie/block.json";
import { calcPercentage, getNextHalvingData } from "@/shared/utils/common";


const barBallHalfWidth = "14px" as const;

const PricePannel = () => {

  // region [Hooks]

  const blockData = useStore(state => state.blockData);
  const { View } = useLottie({ animationData: blockLottieJson, loop: true });

  const recentBlockData = useMemo(() => (blockData[0]), [blockData]);
  const nextHalvingData = useMemo(() => (getNextHalvingData(recentBlockData.height)), [recentBlockData]);
  const halvingPercent = useMemo(
    () => calcPercentage(nextHalvingData?.blockHeight, recentBlockData.height), [nextHalvingData, recentBlockData]);

  // endregion


  // region [Styles]

  const progressStyle: CSSProperties = useMemo(() => (
    { left: `calc(${Math.ceil(halvingPercent)}% - ${barBallHalfWidth})` }
  ), [halvingPercent]);

  // endregion


  return (
    <HorizontalCard className="block-card" rows={1}>

      <h2 className="block-card__title">NEXT HALVING</h2>

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
          {/* <BlockRemainingIcon size={28} color="#fff" /> */}
          <div className="block-card__guage__area__remaining__lottie">
            {View}
          </div>
          <span className="block-card__remaining__text">
            {comma(recentBlockData.height)} | {comma(nextHalvingData.blockHeight - recentBlockData.height)} remaining
          </span>
        </div>

      </div>

    </HorizontalCard>
  );
};

export default memo(PricePannel);
