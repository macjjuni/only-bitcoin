import { memo } from "react";
import Lottie, { type LottieProps } from "react-lottie-player";

interface ILottie {
  option: LottieProps;
  play: boolean;
  animationData?: object | undefined;
  speed: number;
  onClick?: () => void;
}

const LottieItem = ({ option, play, animationData, speed, onClick }: ILottie) => {
  return <Lottie onClick={onClick} {...option} play={play} animationData={animationData} speed={speed} />;
};

export default memo(LottieItem);
