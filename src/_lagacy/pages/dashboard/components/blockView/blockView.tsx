import { memo, useCallback, useState } from "react";
import type { LottieProps } from "react-lottie-player";
import { BlockProps } from "@/store/store.interface";
import CountText from "@/components/atom/CountText/CountText";
import LottieItem from "@/components/atom/LottieItem";
import PopOver from "./components/PopOver";
import BlockLottie from "@/assets/lotties/block.json";
import "./blockView.scss";

const defaultOption: LottieProps = { loop: true, play: true };
const lottieOption = { ...defaultOption, style: { width: "48px", height: "48px" } };

const BlockView = ({ blockData }: { blockData: BlockProps }) => {
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
  const handlePopoverOpen = useCallback((e: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(e.currentTarget);
  }, []);

  const handlePopoverClose = useCallback(() => {
    setAnchorEl(null);
  }, []);

  return (
    <div className="only-btc__block-view">
      <div className="only-btc__block-view__container" onMouseEnter={handlePopoverOpen} onMouseLeave={handlePopoverClose}>
        <LottieItem className="only-btc__block-view__lottie" play option={lottieOption} animationData={BlockLottie} speed={1} />
        <CountText className="only-btc__block-view__text" text={blockData.height} duration={0.3} isAnime />
      </div>
      <PopOver anchorEl={anchorEl} open={Boolean(anchorEl)} handlePopoverClose={handlePopoverClose} />
    </div>
  );
};

export default memo(BlockView);
