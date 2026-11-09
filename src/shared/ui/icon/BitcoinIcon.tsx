import { BITCOIN_ICON_PATH } from "@/shared/lib/bitcoinIconCanvas";
import type { IconTypes } from "./icon";

/** 헤더·캔버스와 같은 비트코인 패스를 사용하는 SVG 아이콘. */
export default function BitcoinIcon({
  size = 24,
  color = "currentColor",
  className,
  style,
}: IconTypes) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 -0.5 34 34"
      className={className}
      style={style}
      aria-hidden="true"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path d={BITCOIN_ICON_PATH} fill={color} fillRule="evenodd" clipRule="evenodd" />
    </svg>
  );
}
