import { useLottie } from "lottie-react";
import { CSSProperties, memo, useMemo } from "react";
import "./Lottie.scss";


interface LottieTypes {
  animationData: unknown;
  loop?: boolean
  width?: string;
  height?: string;
  style?: CSSProperties;
}


const Lottie = ({ animationData, loop = true, width = "100%", height = "100%", style }: LottieTypes) => {

  // region [Hooks]
  const { View } = useLottie({ animationData, loop });
  // endregion


  // region [Styles]
  const rootStyle = useMemo(() => {
    return { width, height, ...style }
  }, [width, height, style]);
  // endregion

  return (
    <div className="lottie" style={rootStyle}>{View}</div>
  );
};

const MemoizedLottie = memo(Lottie);
MemoizedLottie.displayName = "Lottie";


export default MemoizedLottie;