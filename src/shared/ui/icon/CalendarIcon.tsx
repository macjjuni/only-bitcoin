import { memo } from "react";
import type { IconTypes } from "./icon";

const CalendarIcon = ({ size = "100%", color = "currentColor", style, className }: IconTypes) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      style={style}
      className={className}
      preserveAspectRatio="xMidYMid meet"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M13 20v-4h4.001v4H13Zm-6 0v-4h4v4H7Zm-6 0v-4h4v4H1Zm12-6v-4h4v4h-4Zm-6 0v-4h4v4H7Zm-6 0v-4h4v4H1Zm18-6V3.999h4V8h-4Zm0 6v-4h4v4h-4Zm-6-6V3.999h4.001V8H13ZM7 8V3.999h4V8H7Z"
        fill={color}
      />
    </svg>
  );
};

export default memo(CalendarIcon);
