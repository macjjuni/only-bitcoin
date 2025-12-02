import { memo } from "react";
import { IconTypes } from "@/components/ui/icon/icon";

const AnimationIcon = ({ size = "100%", color = "currentColor", style }: IconTypes) => {
  return (
    <svg width={size} height={size} fill={color} viewBox="0 0 36 36" xmlns="http://www.w3.org/2000/svg" style={style}>
      <g strokeWidth="0" />
      <g strokeLinecap="round" strokeLinejoin="round" />
      <g>
        <g>
          <path d="M3.5,23.77a6.41,6.41,0,0,0,9.33,8.67A11.65,11.65,0,0,1,3.5,23.77Z" />
          <path d="M7.68,14.53a9.6,9.6,0,0,0,13.4,13.7A14.11,14.11,0,0,1,7.68,14.53Z" />
          <path d="M21.78,2A12.12,12.12,0,1,1,9.66,14.15,12.12,12.12,0,0,1,21.78,2" />
        </g>
      </g>
    </svg>
  );
};

export default memo(AnimationIcon);
