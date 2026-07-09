"use client";

import { useLottie } from "lottie-react";
import { CountText, UpdownIcon } from "@/components";
import LightningLottieData from "@/shared/assets/lottie/lightning.json";

interface MiningMetricHeaderProps {
  hasData: boolean;
  allTimeHighValue: string;
  percentage: number;
}

export default function MiningMetricHeader({
  hasData,
  allTimeHighValue,
  percentage,
}: MiningMetricHeaderProps) {
  // region [Hooks]
  const { View: lightningLottie } = useLottie({
    animationData: LightningLottieData,
    loop: true,
  });
  // endregion

  return (
    <div className="flex flex-col justify-start gap-2 text-current relative">
      <div className="flex justify-start items-center px-2">
        <div className="flex gap-2 relative">
          <span className="text-base font-number font-bold">{allTimeHighValue}</span>

          {hasData && percentage === 0 && (
            <div className="absolute top-1/2 -right-8 -translate-y-[46%] flex justify-center items-center w-10 h-10">
              {lightningLottie}
            </div>
          )}

          {Math.abs(percentage) > 0.01 && (
            <span className="flex justify-center items-center gap-0.5 font-number font-bold text-[12px] leading-4">
              <UpdownIcon isUp={percentage > 0} />
              <CountText value={percentage} decimals={2} />%
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
