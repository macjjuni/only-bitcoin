import { memo } from "react";
import type { IconTypes } from "./icon";

const ShootingStarIcon = ({
  size = "100%",
  color = "currentColor",
  style,
  className,
}: IconTypes) => {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      style={style}
      className={className}
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M12.5 6.5L10 4M10.5 10.5L5 5M6.5 12.5L4 10M9 15L13 13L15 9L17 13L21 15L17 17L15 21L13 17L9 15Z"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
};

export default memo(ShootingStarIcon);
