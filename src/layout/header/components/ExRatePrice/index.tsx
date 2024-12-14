import { memo, useMemo } from "react";
import { useBearStore } from "@/store";
import { comma } from "@/utils/string";
import ChipItem from "@/components/atom/ChipItem/ChipItem";
import TetherIcon from "@/components/icon/TetherIcon";


const ExRatePrice = ({ onClick }: { onClick: () => void }) => {
  const { basePrice } = useBearStore((state) => state.exRate);
  const isUsdtEnabled = useBearStore(state => state.isUsdtRateEnabled);

  const memoizedLabel = useMemo(() => {
    if (isUsdtEnabled) { return <TetherIcon /> }
    return "KRW";
  }, [isUsdtEnabled])

  return <ChipItem onClick={onClick} label={memoizedLabel} value={comma(basePrice?.toString())} />;
};

export default memo(ExRatePrice);
