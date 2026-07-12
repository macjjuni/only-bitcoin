"use client";

import { memo, useMemo } from "react";
import { useBitcoinStore } from "@/entities/bitcoin";
import { useMounted } from "@/shared/lib/hooks";
import useSettingStore from "@/shared/stores/settingStore";
import { Card, CardContent, CountText, UpdownIcon } from "@/shared/ui";

interface TickerItem {
  code: "KRW" | "USD";
  sign: string;
  price: number;
  change: number;
}

const PriceTicker = () => {
  // region [Hooks]
  const bitcoinPrice = useBitcoinStore((state) => state.bitcoinPrice);
  const currency = useSettingStore((state) => state.setting.currency);
  const isMounted = useMounted();
  // endregion

  // region [Privates]
  const tickers = useMemo<TickerItem[]>(() => {
    const items: TickerItem[] = [
      {
        code: "KRW",
        sign: "₩",
        price: bitcoinPrice.krw,
        change: Number(bitcoinPrice.krwChange24h),
      },
      {
        code: "USD",
        sign: "$",
        price: bitcoinPrice.usd,
        change: Number(bitcoinPrice.usdChange24h),
      },
    ];

    return items.filter(({ code, price }) => currency.includes(code) && price > 0);
  }, [bitcoinPrice, currency]);
  // endregion

  if (!isMounted || tickers.length === 0) {
    return null;
  }

  return (
    <Card>
      <CardContent className="flex justify-evenly gap-4 items-center p-3 font-number text-md font-bold">
        {tickers.map(({ code, sign, price, change }) => {
          const isUp = change >= 0;

          return (
            <div
              key={code}
              className="flex justify-start items-center gap-1.5 whitespace-nowrap text-md"
            >
              <span className="text-bitcoin">₿</span>
              <span>
                {sign}
                <CountText value={price} />
              </span>
              <span
                className={`flex justify-start items-center gap-1 text-xs ${isUp ? "text-up" : "text-down"}`}
              >
                <UpdownIcon size={9} isUp={isUp} />
                {Math.abs(change).toFixed(2)}%
              </span>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
};

const MemoizedPriceTicker = memo(PriceTicker);
MemoizedPriceTicker.displayName = "PriceTicker";

export default MemoizedPriceTicker;
