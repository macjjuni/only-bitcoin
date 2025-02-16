import { CSSProperties, memo, useMemo } from "react";
import HorizontalCard from "@/widgets/overview/card/horizontalCard/HorizontalCard";
import { BlockRemainingIcon } from "@/shared/icons";
import useStore from "@/shared/stores/store";
import { comma } from "@/shared/utils/string";
import { calcPercentage } from "@/shared/utils/common";
import "./BlockCard.scss";


const barBallHalfWidth = '14px' as const;

const PricePannel = () => {

  // region [Hooks]

  const { height, nextHalving } = useStore(state => state.blockData);

  const percent = useMemo(() => {
    return calcPercentage(nextHalving.nextHalvingHeight, height);
  }, [height, nextHalving]);

  // endregion


  // region [Hooks]

  const progressStyle: CSSProperties = useMemo(() => ({left: `calc(${Math.ceil(percent)}% - ${barBallHalfWidth})`}), [percent]);

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
              {percent}%
            </span>
          </div>

        </div>

        <div className="block-card__guage__area__remaining">
          <BlockRemainingIcon size={28} color="#fff" />
          <span className="block-card__remaining__text">
            {comma(height)} | {comma(nextHalving.remainingHeight)} remaining
          </span>
        </div>

      </div>

    </HorizontalCard>
  );
};

export default memo(PricePannel);
