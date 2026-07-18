"use client";

import { useMemo } from "react";
import type { InitialPrice } from "@/entities/bitcoin";
import { useBitcoinStore } from "@/entities/bitcoin";
import useSettingStore from "@/shared/stores/settingStore";
import { CountText, UpdownIcon } from "@/shared/ui";
import PriceMiniChart from "./PriceMiniChart";

interface PricePanelTypes {
  initialPrice: InitialPrice;
}

export default function PricePanel({ initialPrice }: PricePanelTypes) {
  // region [Hooks]
  const bitcoinPrice = useBitcoinStore((state) => state.bitcoinPrice);
  const currency = useSettingStore((state) => state.setting.currency);

  const Currencies = useMemo(
    () => [
      {
        code: "KRW",
        sign: "₩",
        price: Number(bitcoinPrice.krw) || Number(initialPrice.krw),
        percent: Number(bitcoinPrice.krw)
          ? Number(bitcoinPrice.krwChange24h)
          : Number(initialPrice.krwChange24h),
        signSize: "text-[20px]",
      },
      {
        code: "USD",
        sign: "$",
        price: Number(bitcoinPrice.usd) || Number(initialPrice.usd),
        percent: Number(bitcoinPrice.usd)
          ? Number(bitcoinPrice.usdChange24h)
          : Number(initialPrice.usdChange24h),
        signSize: "text-[22px]",
      },
    ],
    [bitcoinPrice, initialPrice],
  );

  const visibleCurrencies = useMemo(
    () => Currencies.filter(({ code }) => currency.includes(code)),
    [Currencies, currency],
  );
  // endregion

  if (!visibleCurrencies.length) return null;

  return (
    <div className="flex justify-between items-center gap-1.5 px-0">
      <div className="flex flex-col flex-1 min-w-0">
        {visibleCurrencies.map(({ code, sign, price, percent, signSize }) => {
          const isUp = percent >= 0;
          const isSingle = visibleCurrencies.length === 1;

          return (
            <div
              key={code}
              className={`flex items-center justify-between gap-2 font-bold whitespace-nowrap overflow-hidden font-number${isSingle ? " mb-8" : ""}`}
            >
              <span className="flex items-center">
                <span className={`flex justify-center items-center w-6 ${signSize}`}>{sign}</span>
                <CountText value={price} className="text-2xl lg:text-3xl" />
              </span>
              <span className={`flex items-center text-[12px] ${isUp ? "text-up" : "text-down"}`}>
                <UpdownIcon isUp={isUp} className="mr-1" />
                <CountText value={Math.abs(percent)} decimals={2} />%
              </span>
            </div>
          );
        })}
      </div>

      <div className="flex-shrink-0">
        <PriceMiniChart barCount={10} width={140} height={60} />
      </div>
    </div>
  );
}
