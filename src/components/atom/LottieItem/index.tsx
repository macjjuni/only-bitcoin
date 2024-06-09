import { memo } from "react";
import Lottie, { type LottieProps } from "react-lottie-player";

interface ILottie {
  option: LottieProps;
  className?: string;
  play: boolean;
  animationData?: object | undefined;
  speed: number;
  onClick?: () => void;
}

const LottieItem = ({ option, play, animationData, speed, onClick, className }: ILottie) => {
  return <Lottie className={className} onClick={onClick} {...option} play={play} animationData={animationData} speed={speed} />;
};

export default memo(LottieItem);
