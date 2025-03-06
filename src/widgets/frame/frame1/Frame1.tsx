import { memo, ReactNode } from "react";
import "./Frame1.scss";
import { ComponentBaseTypes } from "@/shared/types/base.interface";


interface FrameTypes extends ComponentBaseTypes {
  children: ReactNode;
}


const Frame1 = ({ style, className, children }: FrameTypes) => {

  return (
    <div className={`frame-1__area ${className}`} style={style}>
      <div className="frame-1__area__content">
        {children}
      </div>
      <svg className="frame-1__area__svg" width="100%" height="100%" viewBox="0 0 718 374" fill="none"
           preserveAspectRatio="xMidYMid meet"
           xmlns="http://www.w3.org/2000/svg">
        <path
          d="M165.713 334.715H322.919L351.404 364.224L681.809 364.221L707.737 337.531V36.5201L682.02 10.8001H512.863L540.503 38.4401H347.608L318.943 9.77339H35.3334L9.69216 35.6535V337.184L35.6094 363.764L137.249 363.476L165.713 334.715ZM349.391 373.704H347.379L318.895 344.193H169.668L141.217 372.944L31.624 373.255L0.213623 341.04V31.7601L31.3812 0.306728H322.871L351.533 28.9601H517.62L489.98 1.32014H685.947L717.216 32.6001V341.377L685.816 373.7L349.391 373.704Z"
          fill="#05d9e8" />
        <path d="M350.525 0.306648L372.307 22.08H400.117L379.217 1.18673L350.525 0.306648Z" fill="#05d9e8" />
        <path d="M394.659 0.306648L416.441 22.08H444.251L423.351 1.18673L394.659 0.306648Z" fill="#05d9e8" />
        <path d="M438.336 0.306648L460.119 22.08H487.929L467.029 1.18673L438.336 0.306648Z" fill="#05d9e8" />
        <path
          d="M674.343 334.449L667.216 341.141L665.263 342.98H353.599L323.352 373.227H176.089L185.151 364.696H319.827L350.073 334.449H674.343Z"
          fill="#05d9e8" />
      </svg>
    </div>
  );
};
// 7BD3D D
export default memo(Frame1);
