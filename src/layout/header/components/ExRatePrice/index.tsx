import { memo } from "react";
import { useBearStore } from "@/store";
import { comma } from "@/utils/string";
import ChipItem from "@/components/atom/ChipItem/ChipItem";

const ExRatePrice = ({ onClick }: { onClick: () => void }) => {
  const { basePrice } = useBearStore((state) => state.exRate);

  return <ChipItem onClick={onClick} label="KRW" value={comma(basePrice?.toString())} />;
};

export default memo(ExRatePrice);
