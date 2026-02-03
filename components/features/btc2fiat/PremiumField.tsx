"use client";

import { memo, useCallback, useMemo } from "react";
import { RotateCcw, Info } from "lucide-react";
import { KButton, KNumberStepper, KPopover, KPopoverTrigger, KPopoverContent } from "kku-ui";
import useStore from "@/shared/stores/store";


const PremiumField = () => {

  // region [Hooks]
  const premium = useStore(state => state.premium);
  const setPremium = useStore(state => state.setPremium);
  const isPremium = useMemo(() => (premium !== 0), [premium]);
  // endregion

  // region [Events]
  const onClickReset = useCallback(() => {
    setPremium(0);
  }, []);
  // endregion

  return (
    <div className="flex justify-between items-center gap-5 -mt-2 select-none">
      <div className="ml-20 layout-max:ml-0 flex flex-col items-end justify-start gap-0.5">
        <b className="text-base">Premium</b>
        <div className="flex items-center gap-2 text-sm w-full">
          <KPopover>
            <KPopoverTrigger className="hover:opacity-70 transition-opacity cursor-pointer">
              <Info className="text-bitcoin" size={18} />
            </KPopoverTrigger>
            <KPopoverContent className="max-w-xs p-3 ml-1" align="center" sideOffset={8}>
              <div className="space-y-2">
                <h4 className="font-semibold text-sm">프리미엄이란?</h4>
                <p className="text-sm leading-relaxed">
                  비트코인 가격에 추가 비율을 적용하여 계산합니다.
                  거래소마다 다른 시세 차이나 김치 프리미엄 등을
                  반영할 때 유용합니다.
                </p>
                <div className="text-xs opacity-80 mt-1 pt-1.5 border-t">
                  * 프리미엄 5% 설정 시 실제 가격의 105%로 계산됩니다.
                </div>
              </div>
            </KPopoverContent>
          </KPopover>
          P(%):
        </div>
      </div>
      <div className="flex items-center gap-3">
        {
          isPremium && (
            <KButton variant="outline" size="icon" onClick={onClickReset}>
              <RotateCcw />
            </KButton>
          )
        }
        <KNumberStepper value={premium} onChange={setPremium} min={0} step={0.1} max={100} size="lg" />
      </div>
    </div>);
};

const MemoizedPremiumField = memo(PremiumField);
MemoizedPremiumField.displayName = "PremiumField";

export default MemoizedPremiumField;