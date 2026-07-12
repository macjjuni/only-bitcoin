"use client";

import { KSkeleton } from "kku-ui";
import { memo, useMemo } from "react";
import { useBitcoinStore } from "@/entities/bitcoin";
import { formatDate } from "@/shared/lib/date";
import useSettingStore from "@/shared/stores/settingStore";
import { CountText } from "@/shared/ui";
import { calcPremiumPercent } from "@/shared/utils/calculate";

const SURFACE_CLASS = "rounded-md text-card-foreground";
const HEADER_CLASS = "flex flex-col space-y-1.5 p-4";
const TITLE_CLASS = "leading-none tracking-tight flex justify-start items-center";
const CONTENT_CLASS = "p-4 pt-0";

const PremiumPanel = () => {
  // region [Hooks]
  const currency = useSettingStore((state) => state.setting.currency);
  const { krw, usd } = useBitcoinStore((state) => state.bitcoinPrice);
  const { value: usdExRate, date } = useBitcoinStore((state) => state.exRate);
  const isUsdtStandard = useSettingStore((state) => state.setting.isUsdtStandard);
  // endregion

  // region [Templates]
  const PremiumDataList = useMemo(() => {
    const usdKoreaPrice = krw / usdExRate;
    const krwGlobalPrice = usd * usdExRate;

    return [
      { title: "프리미엄 가격", krw: krw - krwGlobalPrice, usd: usdKoreaPrice - usd },
      { title: "한국 가격", krw, usd: usdKoreaPrice },
      { title: "해외 가격", krw: krwGlobalPrice, usd },
    ];
  }, [krw, usd, usdExRate]);

  const PremiumPercent = useMemo(
    () => calcPremiumPercent(krw, usd, usdExRate),
    [krw, usd, usdExRate],
  );
  // endregion

  return (
    <>
      <div className={SURFACE_CLASS}>
        <div className={`${HEADER_CLASS} pt-0 pb-3`}>
          <h3 className={`${TITLE_CLASS} text-2xl font-bold`}>한국 프리미엄</h3>
        </div>
        <div
          className={`${CONTENT_CLASS} flex items-center gap-1 text-[40px] text-current font-bold`}
        >
          {usdExRate ? (
            <>
              <span className="text-3xl">{PremiumPercent > 0 ? "+" : ""}</span>
              <CountText value={PremiumPercent} decimals={2} />%
            </>
          ) : (
            <KSkeleton className="text-3xl text-transparent">Loading</KSkeleton>
          )}
        </div>
      </div>

      {PremiumDataList.map((item) => (
        <div key={item.title} className={SURFACE_CLASS}>
          <div className={`${HEADER_CLASS} pb-0.5 font-thin`}>
            <h3 className={`${TITLE_CLASS} text-md opacity-70 font-normal`}>{item.title}</h3>
          </div>
          <div className={`${CONTENT_CLASS} flex flex-col gap-1 items-center font-bold`}>
            {currency.includes("KRW") && (
              <div className="w-full flex items-baseline">
                <CountText className="text-2xl font-bold" value={item.krw} />
                <span className="text-base font-bold ml-1">KRW</span>
              </div>
            )}
            {currency.includes("USD") && (
              <div className="w-full flex items-baseline">
                <CountText className="text-2xl font-bold" value={item.usd} />
                <span className="text-base font-bold ml-1">USD</span>
              </div>
            )}
          </div>
        </div>
      ))}

      <div className={SURFACE_CLASS}>
        <div className={`${HEADER_CLASS} pb-0.5 font-thin`}>
          <h3 className={`${TITLE_CLASS} text-md opacity-70 font-normal`}>
            {!isUsdtStandard ? "실시간 환율(USD/KRW)" : "USDT/KRW"}
          </h3>
        </div>
        <div className={`${CONTENT_CLASS} flex flex-col items-center font-bold`}>
          <div className="flex justify-between items-end w-full">
            <div className="flex items-baseline">
              <span className="text-2xl font-bold">1</span>
              <span className="text-base font-bold ml-1">{!isUsdtStandard ? "USD" : "USDT"}</span>
              <span className="text-2xl mx-2 font-light opacity-50">/</span>
              <CountText className="text-2xl font-bold" value={usdExRate} decimals={1} />
              <span className="text-base font-bold ml-1">KRW</span>
            </div>
            <div className="mb-[3px]">
              <span className="font-number text-sm layout-max:text-base">
                ({formatDate(date, "YYYY.MM.DD")})
              </span>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

const MemoizedPremiumPanel = memo(PremiumPanel);
MemoizedPremiumPanel.displayName = "PremiumPanel";

export default MemoizedPremiumPanel;
