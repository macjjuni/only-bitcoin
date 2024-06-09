import { memo } from "react";
import { FaBitcoin } from "react-icons/fa";
import { btcColor } from "@/data/btcInfo";

const BtcIcon = ({ size, color = btcColor }: { size: number; color?: string }) => {
  return <FaBitcoin size={size || 28} color={color} fill={color} />;
};

export default memo(BtcIcon);
