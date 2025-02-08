import { useCallback, useMemo, useState } from "react";
import { Stack } from "@mui/material";
import { FaWonSign } from "react-icons/fa";
import { IoLogoUsd } from "react-icons/io";

import { LottieProps } from "react-lottie-player";
import { useBearStore } from "@/store";
import LottieItem from "@/components/atom/LottieItem";
import CountText from "@/components/atom/CountText/CountText";
import NotKeyNotBtc from "@/components/atom/NotKeyNotBtc/NotKeyNotBtc";
import PremiumRate from "@/pages/dashboard/components/premiumRate/premiumRate";
import btcLottie from "@/assets/lotties/bitcoin.json";
import { type BtcProps, type MarketType } from "@/store/store.interface";
import "./marketPrice.scss";

// Lottie Option
const defaultOption: LottieProps = { loop: true };
const btcOption = { ...defaultOption, style: { width: "160px", height: "160px", marginLeft: "-4px" } };

interface IMarketPrice {
  btc: BtcProps;
  market: MarketType;
  isLottiePlay: boolean;
}

const defaultSpeed = 0.3;

const MarketPrice = ({ btc, market, isLottiePlay }: IMarketPrice) => {
  const { isCountAnime, toggleLottie } = useBearStore((state) => state);
  const [speed, setSpeed] = useState(defaultSpeed);

  const mouseEnter = useCallback(() => {
    if (isLottiePlay) setSpeed(2);
  }, [isLottiePlay]);
  const mouseLeave = useCallback(() => {
    if (isLottiePlay) setSpeed(defaultSpeed);
  }, [isLottiePlay]);

  const onToggleLottie = useCallback(() => {
    toggleLottie();
  }, []);

  const getColor = useCallback((color: boolean) => {
    if (color) return "up";
    return "down";
  }, []);

  const WonIcon = useMemo(() => <FaWonSign fontSize={26} />, []);
  const DollarIcon = useMemo(() => <IoLogoUsd fontSize={27} style={{ marginRight: "-4px" }} />, []);

  return (
    <Stack className="box-item" onMouseEnter={mouseEnter} onMouseLeave={mouseLeave} justifyContent="center" height="240px" overflow="hidden">
      <Stack flexDirection="row" justifyContent="space-between" alignItems="center" pr={1}>
        <LottieItem onClick={onToggleLottie} option={btcOption} play={isLottiePlay} animationData={btcLottie} speed={speed + 0.8} />

        <Stack flexDirection="column" justifyContent="flex-end" minWidth="200px" position="relative" mb="12px">
          <PremiumRate btc={btc} className="only-btc__market-price__premium-rate" />
          {market?.includes("KRW") && (
            <Stack className={getColor(btc.krwColor)} flexDirection="row" justifyContent="flex-end" alignItems="center" gap="4px" fontSize={30} lineHeight="38px">
              {WonIcon}
              <CountText className="price-txt-lg" text={btc.krw} duration={0.2} isAnime={isCountAnime} />
            </Stack>
          )}
          {market?.includes("USD") && (
            <Stack className={getColor(btc.usdColor)} flexDirection="row" justifyContent="flex-end" alignItems="center" gap="4px" fontSize={30} lineHeight="38px">
              {DollarIcon}
              <CountText className="price-txt-lg" text={btc.usd} duration={0.2} isAnime={isCountAnime} />
            </Stack>
          )}
        </Stack>
      </Stack>
      <NotKeyNotBtc fontSize="22px" />
    </Stack>
  );
};

export default MarketPrice;
