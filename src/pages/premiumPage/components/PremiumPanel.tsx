import React, { memo, useMemo } from "react";
import { CountText, Lottie } from "@/components";
import { calcPremiumPercent } from "@/shared/utils/calculate";
import premiumData from "@/shared/assets/lottie/premium.json";
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
      { title: "프리미엄", krw: krw - krwGlobalPrice, usd: usdKoreaPrice - usd },
      { title: "국내 시세", krw, usd: usdKoreaPrice },
      { title: "해외 시세", krw: krwGlobalPrice, usd },
    ];
  }, [krw, usd, usdExRate]);

  const PremiumLottie = useMemo(
    () => (
      <Lottie
        animationData={premiumData}
        width="54px"
        height="54px"
        style={{ marginLeft: "-8px" }}
      />
    ),
    []
  );
  // endregion

  return (
    <div className="flex flex-col justify-center items-center gap-8 px-2 py-6">
      {/* Title Section */}
      <div className="flex justify-start items-center gap-2 w-full">
        {PremiumLottie}
        <div className="flex items-center text-[44px] font-bold">
          {usdExRate !== 0 ? (
            <>
              <CountText
                value={calcPremiumPercent(krw, usd, usdExRate)}
                decimals={2}
                className="text-current"
              />
              <span className="text-2xl mt-2 ml-1">%</span>
            </>
          ) : (
            <span className="text-current">Error</span>
          )}
        </div>
      </div>

      {/* Content Section */}
      <div className="flex flex-col gap-8 w-full">
        {PremiumDataList.map((item) => (
          <div key={item.title} className="flex flex-col gap-1">
            <div className="text-base opacity-70 text-muted-foreground">
              {item.title}
            </div>
            <div className="flex flex-col">
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

        {/* Exchange Rate Item */}
        <div className="flex flex-col gap-1">
          <div className="text-base opacity-70 text-muted-foreground">
            {!isUsdtStandard ? "실시간 환율(USD/KRW)" : "USDT/KRW"}
          </div>
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
              <span className="text-xs text-muted-foreground">
                ({formatDate(date, "YYYY.MM.DD")})
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const MemoizedPremiumPanel = memo(PremiumPanel);
MemoizedPremiumPanel.displayName = 'PremiumPanel';

export default MemoizedPremiumPanel;