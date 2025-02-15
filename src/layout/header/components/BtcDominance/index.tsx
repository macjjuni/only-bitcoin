import { memo } from "react";
import ChipItem from "@/components/atom/ChipItem/ChipItem";
import { useBearStore } from "@/store";

const BtcDominance = () => {
  const dominance = useBearStore((state) => state.dominance);
  return <ChipItem label="BTC.D" value={dominance.value} />;
};

export default memo(BtcDominance);
