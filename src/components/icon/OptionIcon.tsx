import { memo } from "react";
import { IconTypes } from "@/components/icon/icon";

const OptionIcon = ({ size = "100%", color = "currentColor", style }: IconTypes) => {
  return (
    <svg viewBox="0 0 24 24" fill="none" width={size} height={size} xmlns="http://www.w3.org/2000/svg" style={style}>
      <g strokeWidth="0"/>
      <g strokeLinecap="round" strokeLinejoin="round"/>
      <g>
        <path d="M4 6H8M8 6V4M8 6V8M20 6H12M4 12H14M14 12V10M14 12V14M20 12H18M4 18H10M10 18V16M10 18V20M20 18H14"
              stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      </g>
    </svg>
  );
};

export default memo(OptionIcon);
