import { CSSProperties, memo } from "react";

interface IconTypes {
  size?: number | string;
  color?: string;
  style?: CSSProperties;
}

const MessageIcon = ({ size = "100%", color = "currentColor", style }: IconTypes) => {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg" fill="none" style={style}>
      <g strokeWidth="0" />
      <g strokeLinecap="round" strokeLinejoin="round" />
      <g>
        <g fill={color}>
          <path
            d="M4 7.75A.75.75 0 014.75 7h3.5a.75.75 0 010 1.5h-3.5A.75.75 0 014 7.75zM4.75 4.5a.75.75 0 000 1.5h6.5a.75.75 0 000-1.5h-6.5z" />
          <path fillRule="evenodd"
                d="M15 3.25A2.25 2.25 0 0012.75 1h-9.5A2.25 2.25 0 001 3.25v11a.75.75 0 001.26.55l2.801-2.6a.75.75 0 01.51-.2h7.179A2.25 2.25 0 0015 9.75v-6.5zm-2.25-.75a.75.75 0 01.75.75v6.5a.75.75 0 01-.75.75H5.572a2.25 2.25 0 00-1.531.6L2.5 12.53V3.25a.75.75 0 01.75-.75h9.5z"
                clipRule="evenodd" />
        </g>
      </g>
    </svg>
  );
};

export default memo(MessageIcon);
