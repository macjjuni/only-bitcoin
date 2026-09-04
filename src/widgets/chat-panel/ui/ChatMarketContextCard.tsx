"use client";

import { ChevronDown, ChevronUp } from "lucide-react";
import { useMemo } from "react";
import { useBitcoinStore } from "@/entities/bitcoin";

interface ChatMarketContextCardProps {
  isExpanded: boolean;
  onToggleExpanded: () => void;
}

const koreaDateFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Asia/Seoul",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

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
      question: createDailyMarketQuestion(premiumPercentage, krwChangePercentage),
    };
  }, [bitcoinPrice, usdExchangeRate]);
  // endregion

  // region [Privates]
  const createNeutralQuestion = (): string => {
    const dailyQuestions = [
      "이번 주 비트코인 시장에서 가장 중요하게 보는 변수는 무엇인가요?",
      "지금 시장을 한 단어로 표현한다면 무엇인가요?",
      "최근 가격 움직임에서 가장 인상 깊었던 순간은 언제였나요?",
    ];
    const koreaDate = koreaDateFormatter.format(new Date());
    const dateSeed = Array.from(koreaDate).reduce(
      (seed, character) => seed + character.charCodeAt(0),
      0,
    );

    return dailyQuestions[dateSeed % dailyQuestions.length];
  };

  function createDailyMarketQuestion(premiumPercentage: number, changePercentage: number): string {
    const koreaDate = koreaDateFormatter.format(new Date());
    const dateSeed = Array.from(koreaDate).reduce(
      (seed, character) => seed + character.charCodeAt(0),
      0,
    );
    const dailyQuestionIndex = dateSeed % 3;

    if (dailyQuestionIndex === 0) {
      return `현재 김치 프리미엄 ${premiumPercentage.toFixed(2)}%, 과열 신호라고 보나요?`;
    }
    if (dailyQuestionIndex === 1) {
      return `BTC가 24시간 동안 ${changePercentage.toFixed(2)}% 움직였어요. 다음 변곡점은 어디라고 보나요?`;
    }

    return `현재 BTC 가격은 ${formatKrwPrice(bitcoinPrice.krw)}예요. 지금 가장 눈여겨보는 지표는 무엇인가요?`;
  }
  // endregion

  // region [Events]
  const onClickContextCard = (): void => {
    onToggleExpanded();
  };
  // endregion

  const dailyQuestion = marketContext?.question ?? createNeutralQuestion();

  return (
    <section className="mx-3 mt-3 overflow-hidden rounded-2xl border border-bitcoin/25 bg-gradient-to-br from-bitcoin/10 to-transparent">
      <button
        type="button"
        aria-expanded={isExpanded}
        onClick={onClickContextCard}
        className="flex w-full items-center justify-between gap-3 px-3 py-2.5 text-left"
      >
        <span>
          <span className="block text-xs font-bold text-bitcoin">지금 시장 · 시스템 정보</span>
          {!isExpanded && (
            <span className="mt-1 block text-[11px] text-neutral-500">오늘의 질문 보기</span>
          )}
        </span>
        {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
      </button>

      {isExpanded && (
        <div className="border-t border-bitcoin/15 px-3 py-3">
          {marketContext && (
            <dl className="mb-3 grid grid-cols-3 gap-2 text-center">
              <div>
                <dt className="text-[10px] text-neutral-500">BTC/KRW</dt>
                <dd className="mt-1 text-[11px] font-bold">{formatKrwPrice(bitcoinPrice.krw)}</dd>
              </div>
              <div>
                <dt className="text-[10px] text-neutral-500">24시간</dt>
                <dd className="mt-1 text-[11px] font-bold">
                  {marketContext.krwChangePercentage.toFixed(2)}%
                </dd>
              </div>
              <div>
                <dt className="text-[10px] text-neutral-500">김프</dt>
                <dd className="mt-1 text-[11px] font-bold">
                  {marketContext.premiumPercentage.toFixed(2)}%
                </dd>
              </div>
            </dl>
          )}
          <p className="text-xs font-semibold leading-5">오늘의 질문</p>
          <p className="mt-1 text-xs leading-5 text-neutral-600 dark:text-neutral-300">
            {dailyQuestion}
          </p>
        </div>
      )}
    </section>
  );
}
