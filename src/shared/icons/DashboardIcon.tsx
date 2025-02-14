import React, { memo } from "react";

const DashboardIcon = ({ size = 24, color = "currentColor" }: { size?: number; color?: string }) => {
  return (
    <svg fill={color} width={`${size}px`} height={`${size}px`} viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
      <g strokeWidth="0" />
      <g strokeLinecap="round" strokeLinejoin="round" />
      <g>
        <path fill={color}
              d="M22,4V7a2,2,0,0,1-2,2H15a2,2,0,0,1-2-2V4a2,2,0,0,1,2-2h5A2,2,0,0,1,22,4ZM9,15H4a2,2,0,0,0-2,2v3a2,2,0,0,0,2,2H9a2,2,0,0,0,2-2V17A2,2,0,0,0,9,15Z"/>
        <path fill="#fff"
          d="M11,4v7a2,2,0,0,1-2,2H4a2,2,0,0,1-2-2V4A2,2,0,0,1,4,2H9A2,2,0,0,1,11,4Zm9,7H15a2,2,0,0,0-2,2v7a2,2,0,0,0,2,2h5a2,2,0,0,0,2-2V13A2,2,0,0,0,20,11Z" />
      </g>
    </svg>
  );
};

export default memo(DashboardIcon);
