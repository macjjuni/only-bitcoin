import React, { memo, useCallback, useState } from "react";
import type { LottieProps } from "react-lottie-player";
import { useBearStore } from "@/store";
import { calcPerDiff } from "@/utils/common";
import { BtcProps } from "@/store/store.interface";
import LottieItem from "@/components/atom/LottieItem";
import CountText from "@/components/atom/CountText/CountText";
import PremiumLottie from "@/assets/lotties/premium.json";
import "./premiumRate.scss";
import PopOver from "@/pages/btc2krw/components/MarketPrice/components/PopOver";
import ExRateDialog from "@/components/modal/ExRateDialog";

const defaultOption: LottieProps = { loop: true, play: true };
const lottieOption = { ...defaultOption, style: { width: "28px", height: "28px" } };

function PremiumRate({ btc, className }: { btc: BtcProps; className?: string }) {
  // region [Hooks]

  const exRate = useBearStore((state) => state.exRate);
  const [isEx, setEx] = useState(false); // 환율&김프 모달

  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);

  // endregion

  // region [Events]

  const handlePopoverOpen = useCallback((e: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(e.currentTarget);
  }, []);

  const handlePopoverClose = useCallback(() => {
    setAnchorEl(null);
  }, []);

  const showDialog = useCallback(() => {
    setEx(true);
  }, [isEx]);

  // endregion

  if (exRate.basePrice === 0) {
    console.error("환율 데이터 에러");
    return null;
  }

  return (
    <div className={`only-btc__premium-rate ${className}`}>
      <button type="button" className="only-btc__premium-rate__container" onClick={showDialog} onMouseEnter={handlePopoverOpen} onMouseLeave={handlePopoverClose}>
        <LottieItem className="only-btc__premium-rate__lottie" play option={lottieOption} animationData={PremiumLottie} speed={1} />
        <CountText className="only-btc__premium-rate__text" text={calcPerDiff(btc.krw, btc.usd, exRate.basePrice)} duration={0.2} decimals={2} isAnime percent />
      </button>
      <PopOver anchorEl={anchorEl} open={Boolean(anchorEl)} handlePopoverClose={handlePopoverClose} />
      {/* 한국 프리미엄 및 환율 정보 */}
      <ExRateDialog open={isEx} setOpen={setEx} />
    </div>
  );
}

export default memo(PremiumRate);
