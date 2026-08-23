import { memo } from "react";
import type { IconTypes } from "./icon";

const ChartColumnIcon = ({
  size = "100%",
  color = "currentColor",
  style,
  className,
}: IconTypes) => {
  return (
    <svg
      fill={color}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      style={style}
      className={className}
      xmlns="http://www.w3.org/2000/svg"
    >
      <path d="M7,12v9a1,1,0,0,1-1,1H3a1,1,0,0,1-1-1V12a1,1,0,0,1,1-1H6A1,1,0,0,1,7,12ZM21,6H18a1,1,0,0,0-1,1V21a1,1,0,0,0,1,1h3a1,1,0,0,0,1-1V7A1,1,0,0,0,21,6ZM13.5,2h-3a1,1,0,0,0-1,1V21a1,1,0,0,0,1,1h3a1,1,0,0,0,1-1V3A1,1,0,0,0,13.5,2Z" />
    </svg>
  );
};

export default memo(ChartColumnIcon);
