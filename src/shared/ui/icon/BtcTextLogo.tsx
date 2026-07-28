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
      viewBox="0 0 110 24"
      className={className}
      style={style}
      xmlns="http://www.w3.org/2000/svg"
    >
      <text
        x="0"
        y="50%"
        dominantBaseline="central"
        fill={color}
        fontSize="24"
        fontWeight="900"
        letterSpacing="0.05em"
        fontFamily="var(--font-sans, system-ui, -apple-system, sans-serif)"
        className="uppercase"
      >
        BITCOIN
      </text>
    </svg>
  );
};

export default memo(BtcTextLogo);
