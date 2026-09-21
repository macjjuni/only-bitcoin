import { memo } from "react";
import type { IconTypes } from "./icon";

interface BtcTextLogoProps extends IconTypes {
  height?: number | string;
  width?: number | string;
}

const BtcTextLogo = ({
  height = 24,
  width = 110,
  color = "currentColor",
  className = "",
  style,
}: BtcTextLogoProps) => {
  return (
    <svg
      width={width}
      height={height}
      viewBox="0 0 120 24"
      /*
       * `overflow-visible` 을 주지 않는다.
       *
       * `<text>` 가 참조하는 `--font-sans` 는 `font-display: swap` 으로 로드되는 Pretendard 라
       * 스왑 전 프레임에서는 폴백 폰트로 그려진다. 폴백은 글자 폭이 더 넓어 워드마크가
       * `viewBox` 를 넘치는데, 넘침을 허용하면 로고가 잠깐 커 보였다가 제자리를 찾는다.
       * 잘라내면 그 순간 끝 글자가 살짝 가려질 뿐 크기는 변하지 않는다.
       * ( Pretendard 로 그려지는 평상시에는 120 안에 들어가 잘릴 일이 없다 )
       */
      className={`block ${className}`}
      style={style}
      xmlns="http://www.w3.org/2000/svg"
    >
      <text
        x="0"
        y="20"
        fill={color}
        fontSize="26"
        fontWeight="900"
        letterSpacing="0"
        fontFamily="var(--font-sans, system-ui, -apple-system, sans-serif)"
        className="uppercase"
      >
        BITCOIN
      </text>
    </svg>
  );
};

export default memo(BtcTextLogo);
