import React, { memo, useMemo } from "react";
import { KCard, KCardContent, KCardHeader, KCardTitle } from "kku-ui";
import { CountText } from "@/components";
import { calcPremiumPercent } from "@/shared/utils/calculate";
import { formatDate } from "@/shared/lib/date";
import useStore from "@/shared/stores/store";


const PremiumPanel = () => {
  // region [Hooks]
  const currency = useStore((state) => state.setting.currency);
  const { krw, usd } = useStore((state) => state.bitcoinPrice);
  const { value: usdExRate, date } = useStore((state) => state.exRate);
  const isUsdtStandard = useStore((state) => state.setting.isUsdtStandard);
  // endregion

  // region [Templates]
  const PremiumDataList = useMemo(() => {
    const usdKoreaPrice = krw / usdExRate;
    const krwGlobalPrice = usd * usdExRate;

    return [
      { title: "프리미엄 가격", krw: krw - krwGlobalPrice, usd: usdKoreaPrice - usd },
      { title: "한국 가격", krw, usd: usdKoreaPrice },
      { title: "해외 가격", krw: krwGlobalPrice, usd }
    ];
  }, [krw, usd, usdExRate]);

  const PremiumPercent = useMemo(() => calcPremiumPercent(krw, usd, usdExRate), [krw, usd, usdExRate])
  // endregion

  return (
    <>
      <KCard className="!border-none !bg-transparent !shadow-none">
        <KCardHeader className="pt-0">
          <KCardTitle className="flex justify-start items-center text-2xl font-bold">한국 프리미엄</KCardTitle>
        </KCardHeader>
        <KCardContent className="flex items-center gap-1 text-[40px] text-current font-bold">
          {usdExRate !== 0 ? (
            <>
              <span className="text-3xl">{ PremiumPercent > 0 ? '+' : '-' }</span>
              <CountText value={PremiumPercent} decimals={2} />
              %
            </>
          ) : (
            <span className="text-3xl text-current">Error</span>
          )}
        </KCardContent>
      </KCard>

      {
        PremiumDataList.map(item => (
          <KCard key={item.title} className="!border-none !bg-transparent !shadow-none">
            <KCardHeader className="font-thin pb-0.5">
              <KCardTitle
                className="flex justify-start items-center text-md opacity-70 font-normal">{item.title}</KCardTitle>
            </KCardHeader>
            <KCardContent className="flex flex-col items-center font-bold">
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
            </KCardContent>
          </KCard>
        ))
      }

      <KCard className="!border-none !bg-transparent !shadow-none">
        <KCardHeader className="font-thin pb-0.5">
          <KCardTitle className="flex justify-start items-center text-md opacity-70 font-normal">
            {!isUsdtStandard ? "실시간 환율(USD/KRW)" : "USDT/KRW"}
          </KCardTitle>
        </KCardHeader>
        <KCardContent className="flex flex-col items-center font-bold">
          <div className="flex justify-between items-end w-full">
            <div className="flex items-baseline">
              <span className="text-2xl font-bold">1</span>
              <span className="text-base font-bold ml-1">
                {!isUsdtStandard ? "USD" : "USDT"}
              </span>
              <span className="text-2xl mx-2 font-light opacity-50">/</span>
              <CountText
                className="text-2xl font-bold"
                value={usdExRate}
                decimals={1}
              />
              <span className="text-base font-bold ml-1">KRW</span>
            </div>
            <div className="mb-[3px]">
              <span className="text-xs font-number">
                ({formatDate(date, "YYYY.MM.DD")})
              </span>
            </div>
          </div>
        </KCardContent>
      </KCard>
    </>
  );
};

const MemoizedPremiumPanel = memo(PremiumPanel);
MemoizedPremiumPanel.displayName = "PremiumPanel";

export default MemoizedPremiumPanel;