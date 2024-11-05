import { memo } from "react";
import Lottie, { type LottieProps } from "react-lottie-player";

interface ILottie {
  option: LottieProps;
  className?: string;
  path: string;
  play: boolean;
  speed: number;
  onClick?: () => void;
}

const LottieItem = ({ option, play, path, speed, onClick, className }: ILottie) => {
  return <Lottie className={className} onClick={onClick} {...option} play={play} path={path} speed={speed} />;
};

export default memo(LottieItem);
