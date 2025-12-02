import { memo } from "react";
import { IconTypes } from "@/components/ui/icon/icon";

const DataIcon = ({ size = "100%", color = "currentColor", style }: IconTypes) => {
  return (
    <svg viewBox="0 0 16 16" width={size} height={size} style={style} fill="none" xmlns="http://www.w3.org/2000/svg">
      <g strokeWidth="0"/>
      <g strokeLinecap="round" strokeLinejoin="round"/>
      <g>
        <path d="M16 1H12V15H16V1Z" fill={color}/>
        <path d="M6 5H10V15H6V5Z" fill={color}/>
        <path d="M0 9H4V15H0V9Z" fill={color}/>
      </g>
    </svg>
  );
};

export default memo(DataIcon);
