import React, { memo } from "react";

const BlockIcon = ({ size = 24, color = "currentColor" }: { size?: number; color?: string }) => {
  return (
    <svg fill={color} width={`${size}px`} height={`${size}px`} viewBox="0 0 32 32" version="1.1" xmlns="http://www.w3.org/2000/svg"
         xmlnsXlink="http://www.w3.org/1999/xlink">
      <g strokeWidth="0" />
      <g strokeLinecap="round" strokeLinejoin="round" />
      <g>
        <defs />
        <g stroke="none" strokeWidth="1" fill="none" fillRule="evenodd">
          <g transform="translate(-154.000000, -881.000000)" fill={color}>
            <path
              d="M186,893.244 L174.962,891.56 L170,881 L165.038,891.56 L154,893.244 L161.985,901.42 L160.095,913 L170,907.53 L179.905,913 L178.015,901.42 L186,893.244" />
          </g>
        </g>
      </g>
    </svg>
  );
};

export default memo(BlockIcon);
