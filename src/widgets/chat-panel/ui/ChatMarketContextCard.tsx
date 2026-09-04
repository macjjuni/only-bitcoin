"use client";

import { ChevronDown, ChevronUp } from "lucide-react";
import { useMemo } from "react";
import { useBitcoinStore } from "@/entities/bitcoin";

interface ChatMarketContextCardProps {
  isExpanded: boolean;
  onToggleExpanded: () => void;
}

const formatKrwPrice = (priceInKrw: number): string => {
  return `${Math.round(priceInKrw).toLocaleString("ko-KR")}원`;
};

export default function ChatMarketContextCard({
  isExpanded,
  onToggleExpanded,
}: ChatMarketContextCardProps) {
  // region [Hooks]
  const bitcoinPrice = useBitcoinStore((store) => store.bitcoinPrice);
  const usdExchangeRate = useBitcoinStore((store) => store.exRate.value);
  const marketContext = useMemo(() => {
    const hasMarketData = bitcoinPrice.krw > 0 && bitcoinPrice.usd > 0 && usdExchangeRate > 0;

    if (!hasMarketData) {
      return null;
    }

    const premiumRatio = bitcoinPrice.krw / (bitcoinPrice.usd * usdExchangeRate) - 1;
    const premiumPercentage = premiumRatio * 100;
    const krwChangePercentage = Number(bitcoinPrice.krwChange24h);

    return {
      premiumPercentage,
      krwChangePercentage,
    };
  }, [bitcoinPrice, usdExchangeRate]);
  // endregion

  // region [Events]
  const onClickContextCard = (): void => {
    onToggleExpanded();
  };
  // endregion

  return (
    <section className="mx-3 mt-3 overflow-hidden rounded-2xl border border-bitcoin/25 bg-gradient-to-br from-bitcoin/10 to-transparent">
      <button
        type="button"
        aria-expanded={isExpanded}
        onClick={onClickContextCard}
        className="flex w-full items-center justify-between gap-3 px-3 py-2.5 text-left"
      >
        <span>
          <span className="block text-xs font-bold text-bitcoin">지금 시장 정보</span>
          {!isExpanded && (
            <span className="mt-1 block text-xs text-neutral-500">시장 지표 보기</span>
          )}
        </span>
        {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
      </button>

      {isExpanded && (
        <div className="border-t border-bitcoin/15 px-3 py-3">
          {marketContext && (
            <dl className="grid grid-cols-3 gap-2 text-center">
              <div>
                <dt className="text-[10px] text-neutral-500">BTC/KRW</dt>
                <dd className="mt-1 text-xs font-number font-bold">
                  {formatKrwPrice(bitcoinPrice.krw)}
                </dd>
              </div>
              <div>
                <dt className="text-[10px] text-neutral-500">24시간</dt>
                <dd className="mt-1 text-xs font-number font-bold">
                  {marketContext.krwChangePercentage.toFixed(2)}%
                </dd>
              </div>
              <div>
                <dt className="text-[10px] text-neutral-500">김프</dt>
                <dd className="mt-1 text-xs font-number font-bold">
                  {marketContext.premiumPercentage.toFixed(2)}%
                </dd>
              </div>
            </dl>
          )}
        </div>
      )}
    </section>
  );
}
