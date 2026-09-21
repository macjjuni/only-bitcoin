"use client";

import { useMemo, useState } from "react";
import { useBitcoinStore } from "@/entities/bitcoin";
import { getCurrentDateTimeKST } from "@/shared/lib/date";
import type { ShareCardTimeframe } from "./shareCardTimeframe";
import { useShareCardChart } from "./useShareCardChart";

/** 상승 · 하락 테마 색상 ( 카드 레이아웃과 무관하게 동일 ) */
export const SURGE_UP_COLOR = "#00E676";
export const SURGE_DOWN_COLOR = "#FF5252";

/** 변동률 정수부가 이 값 이상이면 소수점을 버린다. ( 5Y · 10Y 대응 ) */
const THREE_DIGIT_CHANGE_PERCENT = 100;

export interface ShareCardMetrics {
  timeframe: ShareCardTimeframe;
  usdPrices: number[];
  isChartDataReady: boolean;
  isChartDataLoading: boolean;
  /** 선택 타임프레임 기준 변동률 ( % ) */
  changePercent: number;
  isChangePercentReady: boolean;
  isUp: boolean;
  themeColor: string;
  currentPriceKrw: number;
  currentPriceUsd: number;
  changeAmountKrw: number;
  changeAmountUsd: number;
  /** 변동액 앞에 붙일 부호 */
  changeSign: string;
  changePercentText: string;
  /** 통화 기호 없는 현재가 문자열 ( 기호는 카드 레이아웃이 조합한다 ) */
  currentPriceKrwText: string;
  currentPriceUsdText: string;
  changeAmountKrwText: string;
  changeAmountUsdText: string;
  /** 시계열이 없을 때 차트 자리에 채울 문구 */
  chartPlaceholderMessage: string;
  /** 카드가 열린 시각 ( KST ) */
  capturedAtKst: string;
}

/**
 * 현재가와 변동률로부터 해당 통화의 변동액을 역산.
 *
 * 차트는 바이낸스 BTCUSDT( 달러 ) 기준이라 원화 시계열이 없으므로, 변동률을 각 통화의
 * 현재가에 적용해 변동액을 구한다. ( 기간 내 환율 변동은 반영되지 않는 근사값 )
 */
function calculateChangeAmount(currentPrice: number, changeRatePercent: number): number {
  const changeRate = changeRatePercent / 100;

  if (currentPrice <= 0 || changeRate <= -1) {
    return 0;
  }

  return Math.round(currentPrice - currentPrice / (1 + changeRate));
}

/**
 * 공유 카드가 표시하는 모든 수치와 표기 문자열.
 *
 * 정사각 · 가로형 카드가 같은 값을 그려야 하므로 계산과 포매팅을 한곳에 모은다.
 * 레이아웃마다 다른 것은 배치와 뷰박스 크기뿐이다.
 */
export function useShareCardMetrics(): ShareCardMetrics {
  // region [Hooks]
  const { timeframe, usdPrices, isChartDataReady, isChartDataLoading } = useShareCardChart();
  const bitcoinPrice = useBitcoinStore((state) => state.bitcoinPrice);

  // 카드가 열린 시각을 고정한다. 다이얼로그가 닫히면 언마운트되므로 열 때마다 다시 계산.
  const [capturedAtKst] = useState<string>(getCurrentDateTimeKST);

  /**
   * 24시간 변동률은 `1D` 라벨에서만 의미가 있으므로 그 외 기간의 폴백으로 쓰지 않는다.
   *
   * 시계열이 없을 때 24시간 값으로 대체하면 `7D` 라벨에 24시간 수치가 붙은 카드가 만들어진다.
   * ( 바이낸스 요청이 실패하면 빈 시계열이 정상 응답으로 돌아오므로 이 상태가 계속 유지된다 )
   */
  const changePercent = useMemo(() => {
    if (timeframe === "1D" && bitcoinPrice?.usdChange24h) {
      return Number.parseFloat(bitcoinPrice.usdChange24h);
    }

    if (isChartDataReady) {
      const startPrice = usdPrices[0];
      const endPrice = usdPrices[usdPrices.length - 1];
      if (startPrice > 0) return ((endPrice - startPrice) / startPrice) * 100;
    }

    return 0;
  }, [timeframe, usdPrices, bitcoinPrice, isChartDataReady]);

  /** 시계열이 없어도 `1D` 는 24시간 변동률로 즉시 표기할 수 있다. */
  const isChangePercentReady = useMemo(
    () => isChartDataReady || (timeframe === "1D" && Boolean(bitcoinPrice?.usdChange24h)),
    [isChartDataReady, timeframe, bitcoinPrice],
  );

  const isUp = changePercent >= 0;

  const currentPriceKrw = useMemo(() => {
    if (bitcoinPrice?.krw && bitcoinPrice.krw > 0) return bitcoinPrice.krw;
    return 0;
  }, [bitcoinPrice]);

  const currentPriceUsd = useMemo(() => {
    if (bitcoinPrice?.usd && bitcoinPrice.usd > 0) return bitcoinPrice.usd;
    if (isChartDataReady) return usdPrices[usdPrices.length - 1];
    return 0;
  }, [bitcoinPrice, usdPrices, isChartDataReady]);

  const changeAmountKrw = useMemo(
    () => calculateChangeAmount(currentPriceKrw, changePercent),
    [currentPriceKrw, changePercent],
  );

  const changeAmountUsd = useMemo(
    () => calculateChangeAmount(currentPriceUsd, changePercent),
    [currentPriceUsd, changePercent],
  );

  /**
   * 변동률 표기. 정수부가 세 자리 이상( 100% 이상 )이면 소수점을 버린다.
   *
   * 5Y · 10Y 처럼 변동률이 커지면 큰 폰트에서 텍스트가 카드 폭을 넘기므로 자릿수를 줄인다.
   */
  const changePercentText = useMemo(() => {
    const hasThreeDigitIntegerPart = Math.abs(changePercent) >= THREE_DIGIT_CHANGE_PERCENT;

    return changePercent.toFixed(hasThreeDigitIntegerPart ? 0 : 2);
  }, [changePercent]);

  const currentPriceKrwText = useMemo(() => currentPriceKrw.toLocaleString(), [currentPriceKrw]);

  const currentPriceUsdText = useMemo(
    () => currentPriceUsd.toLocaleString("en-US", { maximumFractionDigits: 0 }),
    [currentPriceUsd],
  );

  const changeAmountKrwText = useMemo(
    () => Math.abs(changeAmountKrw).toLocaleString(),
    [changeAmountKrw],
  );

  const changeAmountUsdText = useMemo(
    () => Math.abs(changeAmountUsd).toLocaleString("en-US"),
    [changeAmountUsd],
  );
  // endregion

  return {
    timeframe,
    usdPrices,
    isChartDataReady,
    isChartDataLoading,
    changePercent,
    isChangePercentReady,
    isUp,
    themeColor: isUp ? SURGE_UP_COLOR : SURGE_DOWN_COLOR,
    currentPriceKrw,
    currentPriceUsd,
    changeAmountKrw,
    changeAmountUsd,
    changeSign: isUp ? "+" : "-",
    changePercentText,
    currentPriceKrwText,
    currentPriceUsdText,
    changeAmountKrwText,
    changeAmountUsdText,
    chartPlaceholderMessage: isChartDataLoading
      ? "차트 데이터를 불러오는 중"
      : "차트 데이터를 불러오지 못했어요",
    capturedAtKst,
  };
}
