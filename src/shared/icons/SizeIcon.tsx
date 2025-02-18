import { memo } from "react";


const HeightIcon = ({ size = 24, color = "currentColor" }: { size?: number; color?: string; }) => {

  return (
    <svg fill={color} width={`${size}px`} height={`${size}px`} viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
      <g strokeWidth="0" />
      <g strokeLinecap="round" strokeLinejoin="round" />
      <g>
        <g>
          <g>
            <rect width="48" height="48" fill="none" />
          </g>
          <g>
            <path
              d="M46,9c0-6.8-19.7-7-22-7S2,2.2,2,9V39c0,6.8,19.7,7,22,7s22-.2,22-7V9.3h0Zm-4,9.8C41,20,34.4,22,24,22S7,20,6,18.8V13.4C11.9,15.9,22.4,16,24,16s12.1-.1,18-2.6Zm0,10C41,30,34.4,32,24,32S7,30,6,28.8V23.4C11.9,25.9,22.4,26,24,26s12.1-.1,18-2.6ZM24,6c9.8,0,16.3,1.8,17.8,3-1.5,1.2-8,3-17.8,3S7.7,10.2,6.2,9C7.7,7.8,14.2,6,24,6Zm0,36C13.6,42,7,40,6,38.8V33.4C11.9,35.9,22.4,36,24,36s12.1-.1,18-2.6v5.4C41,40,34.4,42,24,42Z" />
          </g>
        </g>
      </g>
    </svg>
  );
};

export default memo(HeightIcon);


