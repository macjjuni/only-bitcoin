import { useCallback, memo, CSSProperties, useMemo } from "react";
import CountUp from "react-countup";
import { useBearStore } from "@/store";
import { comma } from "@/utils/string";
import "./CountText.scss";

interface ICount {
  text: number;
  className?: string;
  duration: number;
  percent?: boolean;
  decimals?: number;
  isAnime: boolean;
  style?: CSSProperties;
  leftText?: string;
}

const CountText = ({ text, className, duration = 1, percent, decimals, isAnime, style, leftText }: ICount) => {
  // region [Hooks]

  const isCountAnimate = useBearStore((state) => state.isCountAnime);

  // endregion

  // region [Privates]

  // 카운트다운 애니메이션 최소값
  const convertToZero = useCallback((num: number) => {
    const firstDigit = Math.floor(num / 10 ** Math.floor(Math.log10(num)));
    return firstDigit * 10 ** Math.floor(Math.log10(num));
  }, []);

  const getStartText = useMemo(() => {
    if (!isAnime) {
      return text;
    }
    if (!percent) {
      return convertToZero(text);
    }
    return 0;
  }, [isAnime, percent]);

  // endregion

  return (
    <>
      {isCountAnimate ? (
        <div className="count__text__wrapper">
          {leftText && <span>{leftText}</span>}
          <CountUp className={className} style={style} start={getStartText} end={text} decimals={decimals} duration={isCountAnimate && isAnime ? duration : undefined} />
        </div>
      ) : (
        <span className={`count__text__wrapper ${className}`} style={style}>
          {leftText && <span>{leftText}</span>}
          {comma(text.toFixed(decimals || 0))}
        </span>
      )}
      {percent && <h4 className={className}>%</h4>}
    </>
  );
};

export default memo(CountText);
