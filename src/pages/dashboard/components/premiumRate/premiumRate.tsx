import React, { memo, useCallback, useLayoutEffect, useState } from "react";
import type { LottieProps } from "react-lottie-player";
import { bearStore, useBearStore } from "@/store";
import { calcPerDiff } from "@/utils/common";
import { BtcProps } from "@/store/store.interface";
import LottieItem from "@/components/atom/LottieItem";
import CountText from "@/components/atom/countText/countText";
import PremiumLottie from "@/assets/premium.json";
import "./premiumRate.scss";
import PopOver from "@/pages/btc2krw/components/MarketPrice/components/PopOver";
import { getExRate } from "@/api/exRate";

const defaultOption: LottieProps = { loop: true, play: true };
const lottieOption = { ...defaultOption, style: { width: "28px", height: "28px" } };

function PremiumRate({ btc, className }: { btc: BtcProps; className?: string }) {
  // region [Hooks]

  const exRate = useBearStore((state) => state.exRate);
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);

  // endregion

  // region [Events]

  const handlePopoverOpen = useCallback((e: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(e.currentTarget);
  }, []);

  const handlePopoverClose = useCallback(() => {
    setAnchorEl(null);
  }, []);

  // endregion

  // region [Transactions]

  const getFetchExRate = useCallback(() => {
    getExRate().then((res) => {
      bearStore.setExRate(res);
    });
  }, []);

  // endregion

  // region [Effects]

  useLayoutEffect(() => {
    getFetchExRate();
  }, []);

  // endregion

  if (exRate.basePrice === 0) {
    console.error("환율 데이터 에러");
    return null;
  }

  return (
    <div className={`only-btc__premium-rate ${className}`}>
      <div className="only-btc__premium-rate__container" onMouseEnter={handlePopoverOpen} onMouseLeave={handlePopoverClose}>
        <LottieItem className="only-btc__premium-rate__lottie" play option={lottieOption} animationData={PremiumLottie} speed={1} />
        <CountText className="only-btc__premium-rate__text" text={calcPerDiff(btc.krw, btc.usd, exRate.basePrice)} duration={0.2} decimals={2} isAnime percent />
      </div>
      <PopOver anchorEl={anchorEl} open={Boolean(anchorEl)} handlePopoverClose={handlePopoverClose} />
    </div>
  );
}

export default memo(PremiumRate);
