import { memo } from "react";

const satoshiImagUrl = "https://raw.githubusercontent.com/macjjuni/only-bitcoin/refs/heads/main/public/images/sat.webp";

const SatIcon = ({ width = 40, height = 40 }: { width: number; height: number }) => {
  return <img src={satoshiImagUrl} alt="Satoshi Symbol" className="sat-img" width={width} height={height} />;
};

export default memo(SatIcon);
