import { memo } from "react";
import { IconTypes } from "@/components/ui/icon/icon";

const MessageIcon = ({ size = "100%", color = "currentColor", style }: IconTypes) => {
  return (
    <svg viewBox="0 0 16 16" width={size} height={size} version="1.1" xmlns="http://www.w3.org/2000/svg" xmlnsXlink="http://www.w3.org/1999/xlink"
         fill={color} style={style}>
      <g strokeWidth="0"/>
      <g strokeLinecap="round" strokeLinejoin="round"/>
      <g>
        <path fill={color} d="M3 6h2v1h-2v-1z"/>
        <path fill={color} d="M6 6h7v1h-7v-1z"/>
        <path fill={color} d="M3 8h2v1h-2v-1z"/>
        <path fill={color} d="M6 8h7v1h-7v-1z"/>
        <path fill={color} d="M3 10h2v1h-2v-1z"/>
        <path fill={color} d="M6 10h7v1h-7v-1z"/>
        <path fill={color} d="M0 1v14h16v-14h-16zM15 14h-14v-10h14v10zM15 3h-1v-1h1v1z"/>
      </g>
    </svg>
  );
};

export default memo(MessageIcon);
