import React, { memo } from "react";

const BlockIcon = ({ size = 24, color = "currentColor" }: { size?: number; color?: string }) => {
  return (
    <svg fill={color} width={`${size}px`} height={`${size}px`} viewBox="0 0 36 36" preserveAspectRatio="xMidYMid meet" xmlns="http://www.w3.org/2000/svg" stroke={color}>
      <g strokeWidth="0" />
      <g strokeLinecap="round" strokeLinejoin="round" />
      <g>
        <path
          d="M31.42,9.09l-13-6a1,1,0,0,0-.84,0l-13,6A1,1,0,0,0,4,10V27a1,1,0,0,0,.58.91l13,6a1,1,0,0,0,.84,0l13-6A1,1,0,0,0,32,27V10A1,1,0,0,0,31.42,9.09ZM18,5.1,28.61,10,18,14.9,7.39,10ZM6,11.56l11,5.08v14.8L6,26.36ZM19,31.44V16.64l11-5.08v14.8Z" />
        {/* <rect x="0" y="0" width={size} height={size} fillOpacity="0" /> */}
      </g>
    </svg>
  );
};

export default memo(BlockIcon);
