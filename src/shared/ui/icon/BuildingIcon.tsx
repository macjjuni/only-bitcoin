import { memo } from "react";
import type { IconTypes } from "./icon";

const BuildingIcon = ({ size = "100%", style, className }: IconTypes) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 56 56"
      style={style}
      className={className}
      preserveAspectRatio="xMidYMid meet"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M13.52 13.67C13.25 14.76 11.42 14.17 10.82 14.02L11.3 12.09C11.9 12.24 13.8 12.53 13.52 13.67ZM11.96 9.45003L11.52 11.2C12.02 11.32 13.55 11.83 13.8 10.84C14.05 9.81003 12.46 9.57003 11.96 9.45003ZM19.76 13.93C18.69 18.21 14.35 20.82 10.06 19.76C5.78 18.69 3.16 14.35 4.23 10.07C5.3 5.78003 9.64 3.18003 13.93 4.24003C18.21 5.31003 20.83 9.65003 19.76 13.93ZM9.37 13.34C9.33 13.45 9.22 13.61 8.97 13.55C8.93 13.55 8.33 13.39 8.33 13.39L7.89 14.39L9.03 14.67C9.25 14.73 9.45 14.78 9.66 14.84L9.3 16.29L10.17 16.51L10.53 15.07C10.77 15.14 11 15.19 11.23 15.25L10.87 16.68L11.75 16.9L12.11 15.45C13.61 15.73 14.74 15.62 15.21 14.26C15.59 13.17 15.19 12.54 14.4 12.13C14.97 12 15.4 11.62 15.52 10.84C15.68 9.78003 14.87 9.20003 13.76 8.83003L14.12 7.38003L13.24 7.16003L12.89 8.56003C12.66 8.50003 12.42 8.45003 12.18 8.39003L12.53 6.98003L11.66 6.76003L11.3 8.20003C11.11 8.16003 10.92 8.11003 10.74 8.07003L9.53 7.76003L9.3 8.70003C9.3 8.70003 9.94 8.85003 9.94 8.86003C10.29 8.95003 10.35 9.18003 10.35 9.37003L9.36 13.32L9.37 13.34Z"
        fill="hsl(var(--foreground))"
        transform="translate(-5.5 -5.5) scale(2.0625)"
      />

      <g
        fill="none"
        stroke="hsl(var(--foreground))"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        transform="translate(12.2 12.2) scale(2.0625)"
      >
        <path
          d="M5 21V6a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v3h5a1 1 0 0 1 1 1v11Z"
          fill="hsl(var(--background))"
        />
        <path d="M3 21h18" />
        <path d="M8 9h2" />
        <path d="M8 13h2" />
        <path d="M8 17h2" />
        <path d="M16 13h0" />
        <path d="M16 17h0" />
      </g>
    </svg>
  );
};

export default memo(BuildingIcon);
