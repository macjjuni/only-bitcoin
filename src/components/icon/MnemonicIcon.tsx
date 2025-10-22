import { memo } from "react";
import { IconTypes } from "@/components/icon/icon";

const MnemonicIcon = ({ size = "100%", color = "currentColor", style }: IconTypes) => {
  return (
    <svg width={size} height={size} fill={color} viewBox="0 0 32 32" version="1.1" xmlns="http://www.w3.org/2000/svg" style={style}>
      <g strokeWidth="0"/>
      <g strokeLinecap="round" strokeLinejoin="round" />
      <g>
        <title>list</title>
        <path d="M0 26.016v-20q0-2.496 1.76-4.256t4.256-1.76h20q2.464 0 4.224 1.76t1.76 4.256v20q0 2.496-1.76 4.224t-4.224 1.76h-20q-2.496 0-4.256-1.76t-1.76-4.224zM4 26.016q0 0.832 0.576 1.408t1.44 0.576h20q0.8 0 1.408-0.576t0.576-1.408v-20q0-0.832-0.576-1.408t-1.408-0.608h-20q-0.832 0-1.44 0.608t-0.576 1.408v20zM8 24v-4h4v4h-4zM8 18.016v-4h4v4h-4zM8 12v-4h4v4h-4zM14.016 24v-4h9.984v4h-9.984zM14.016 18.016v-4h9.984v4h-9.984zM14.016 12v-4h9.984v4h-9.984z"/>
      </g>
    </svg>
  );
};

export default memo(MnemonicIcon);
