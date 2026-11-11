import fetcher from "@/shared/utils/fetcher";
import type { BinanceKline, BtcCandle, MarketChartFormattedData } from "../model/market";

const BINANCE_KLINES_URL = "https://api.binance.com/api/v3/klines";

export type BinanceInterval = "5m" | "15m" | "30m" | "1h" | "4h" | "12h" | "1d" | "1w";

/**
 * Binance Klines API 호출 후 차트 데이터 형식으로 변환
 * - x: openTime (ms)
 * - y: close 가격 (정수)
 */
export async function fetchBinanceKlines(
  interval: BinanceInterval,
  limit: number,
): Promise<MarketChartFormattedData> {
  const searchParams = new URLSearchParams({
    symbol: "BTCUSDT",
    interval,
    limit: limit.toString(),
  });

  const data = await fetcher<BinanceKline[]>(`${BINANCE_KLINES_URL}?${searchParams.toString()}`);

  return {
    date: data.map((kline) => kline[0]),
    price: data.map((kline) => Math.floor(Number(kline[4]))),
  };
}

/** BTCUSDT 캔들 조회. 시가·고가·저가·종가와 거래대금까지 씀. */
export async function fetchBinanceCandles(
  interval: BinanceInterval,
  limit: number,
): Promise<BtcCandle[]> {
  const searchParams = new URLSearchParams({
    symbol: "BTCUSDT",
    interval,
    limit: limit.toString(),
  });

  const data = await fetcher<BinanceKline[]>(`${BINANCE_KLINES_URL}?${searchParams.toString()}`);

  return data.map((kline) => ({
    openTime: kline[0],
    open: Number(kline[1]),
    high: Number(kline[2]),
    low: Number(kline[3]),
    close: Number(kline[4]),
    quoteVolume: Number(kline[7]),
  }));
}
