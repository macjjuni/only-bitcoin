import { memo } from "react";
import { IconTypes } from "@/components/icon/icon";

const ListIcon = ({ size = "100%", color = "currentColor", style }: IconTypes) => {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="none" xmlns="http://www.w3.org/2000/svg">
      <g strokeWidth="0"/>
      <g strokeLinecap="round" strokeLinejoin="round"/>
      <g >
        <path d="M10 6.5H20V8H10V6.5Z" fill={color}/>
        <path d="M10 16.5H20V18H10V16.5Z" fill={color}/>
        <path d="M10 11.5H20V13H10V11.5Z" fill={color}/>
        <path
          d="M7.99847 10H4.44745V8.68805H5.48827V5.87172C5.20838 5.98834 4.87311 6.04665 4.48244 6.04665V4.74344C4.83229 4.74344 5.10634 4.68805 5.30459 4.57726C5.50868 4.4723 5.68069 4.27988 5.82063 4H7.0801V8.68805H7.99847V10Z"
          fill={color}/>
        <path
          d="M8.29928 19H4.12086V17.9986L6.19281 15.9525C6.49784 15.659 6.65036 15.3223 6.65036 14.9424C6.65036 14.5568 6.48921 14.364 6.16691 14.364C5.77554 14.364 5.57986 14.6288 5.57986 15.1583H4C4 14.4619 4.19568 13.9266 4.58705 13.5525C4.97266 13.1842 5.49928 13 6.16691 13C6.82878 13 7.34101 13.1727 7.7036 13.518C8.06619 13.8691 8.24748 14.3439 8.24748 14.9424C8.24748 15.3683 8.16691 15.7252 8.00576 16.0129C7.8446 16.3007 7.5482 16.6518 7.11655 17.0662L6.4518 17.705H8.29928V19Z"
          fill={color}/>
      </g>
    </svg>
  );
};

export default memo(ListIcon);
