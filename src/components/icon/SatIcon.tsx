import { memo } from "react";

const SatIcon = ({ width = 40, height = 40 }: { width: number; height: number }) => {
  return <img src="./images/sat.webp" alt="Satoshi Symbol" className="sat-img" width={width} height={height} />;
};

export default memo(SatIcon);
