import { CSSProperties, memo } from "react";

interface IconTypes {
  size?: number | string;
  color?: string;
  style?: CSSProperties;
}

const MemeIcon = ({ size = "100%", color = "currentColor", style }: IconTypes) => {
  return (

      <svg width={size} height={size} viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg" fill="none" style={style}>
        <path fill="none" stroke={color} strokeLinecap="round" strokeLinejoin="round" d="M12.07,42.5s-1-2.39-.85-3.15A9.86,9.86,0,0,0,10.71,36c-.17-.38-1-3.91-1.09-4.42s-.34-5.09,0-5.51a5.86,5.86,0,0,0,1.07-2,5.25,5.25,0,0,1,.4-2.65c.46-.67,6-6.85,6.86-7.19s1.93-.5,2.23-.71A24.63,24.63,0,0,1,26,12.27c1.72,0,6.52,2.1,7.7,6.35S37.12,24,37.5,24.76s.51,7.49.51,9.38.71,2.86.5,3.53-1.62,4.83-1.62,4.83"/>
        <path fill="none" stroke={color} strokeLinecap="round" strokeLinejoin="round" d="M22.36,34.77a3.74,3.74,0,0,0,4.25,2.61c2.48-.47,2.73-1.73,2.65-3.07a16.31,16.31,0,0,0-.17-1.81"/>
        <path fill="none" stroke={color} strokeLinecap="round" strokeLinejoin="round" d="M27.53,18.05a3.29,3.29,0,0,1,3.33.93c1.13,1.26,3.74,4.45,2.69,6s-4.25,2.48-5.72,1.51S24,23.59,24.34,22.33,26.78,18.33,27.53,18.05Z"/>
        <path fill="none" stroke={color} strokeLinecap="round" strokeLinejoin="round" d="M18.54,21.86c1.21.7,3.11,1.6,2.6,3s-2.39,4.2-3.53,4.58-3.28.38-4-.76-.88-4.37-.37-5S16.49,20.67,18.54,21.86Z"/>
        <path fill="none" stroke={color} strokeLinecap="round" strokeLinejoin="round" d="M13.57,23.41c.68.16,1.71.52,1.61,1.77-.07.88-1.83,1.37-2.17,1.33"/>
        <path fill="none" stroke={color} strokeLinecap="round" strokeLinejoin="round" d="M30.86,19a1.49,1.49,0,0,0-1.76,1.78,1.73,1.73,0,0,0,2,.8A1.47,1.47,0,0,0,32,20.32"/>
        <path fill="none" stroke={color} strokeLinecap="round" strokeLinejoin="round" d="M40.5,42.5H7.5a2,2,0,0,1-2-2V7.5a2,2,0,0,1,2-2h33a2,2,0,0,1,2,2v33A2,2,0,0,1,40.5,42.5Z"/>
      </svg>
  );
};

export default memo(MemeIcon);
