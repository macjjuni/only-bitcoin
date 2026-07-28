import { useQuery } from "@tanstack/react-query";
import { type Binance24hTickerResponse, fetchBinance24hTicker } from "./binance";

/** 카드·위젯에서 사용하는 BTC 24시간 통계 ( 바이낸스 BTCUSDT, 달러 기준 ) */
export interface Btc24hStats {
  highPriceUsd: number;
  lowPriceUsd: number;
  quoteVolumeUsd: number;
  changePercent: number;
}

/** 문자열 필드를 숫자로 변환한다. 파싱 실패 시 0 으로 흡수한다. */
const parseNumericField = (rawValue: string): number => {
  const parsedValue = Number(rawValue);

  return Number.isFinite(parsedValue) ? parsedValue : 0;
};

const parseBtc24hStats = (ticker: Binance24hTickerResponse): Btc24hStats => ({
  highPriceUsd: parseNumericField(ticker.highPrice),
  lowPriceUsd: parseNumericField(ticker.lowPrice),
  quoteVolumeUsd: parseNumericField(ticker.quoteVolume),
  changePercent: parseNumericField(ticker.priceChangePercent),
});

const fetchBtc24hStats = async (): Promise<Btc24hStats | null> => {
  try {
    return parseBtc24hStats(await fetchBinance24hTicker());
  } catch (error) {
    console.warn("❌ Binance 24H Ticker 조회 실패", error);
    return null;
  }
};

/** 24H 거래대금(달러)을 "$28.4B", "$850.2M" 형태의 축약 단위로 변환 */
export function formatUsdVolume(volumeInUsd: number): string {
  if (!volumeInUsd || volumeInUsd <= 0) {
    return "-";
  }
  if (volumeInUsd >= 1_000_000_000) {
    const billion = volumeInUsd / 1_000_000_000;
    return `$${billion.toFixed(1)}B`;
  }
  if (volumeInUsd >= 1_000_000) {
    const million = volumeInUsd / 1_000_000;
    return `$${million.toFixed(1)}M`;
  }
  if (volumeInUsd >= 1_000) {
    const thousand = volumeInUsd / 1_000;
    return `$${thousand.toFixed(1)}K`;
  }

  return `$${Math.round(volumeInUsd).toLocaleString("en-US")}`;
}

/**
 * BTC 롤링 24시간 고가 / 저가 / 거래대금 조회.
 *
 * 공유 카드의 스파크라인·변동률이 이미 바이낸스 BTCUSDT 기준이므로 동일 소스를 사용해
 * "현재가가 24H 고가보다 높은" 식의 기준 불일치를 방지한다.
 */
export function useBinanceTicker24hQuery() {
  const REFRESH_TIME_MS = 1000 * 30;

  return useQuery<Btc24hStats | null>({
    queryKey: ["btc-binance-ticker-24h"],
    queryFn: fetchBtc24hStats,
    staleTime: REFRESH_TIME_MS,
    refetchInterval: REFRESH_TIME_MS,
  });
}
