import type { BinanceKline, MarketChartFormattedData } from "@/shared/types/api/marketChart";
import fetcher from "@/shared/utils/fetcher";

const BINANCE_KLINES_URL = "https://api.binance.com/api/v3/klines";

export type BinanceInterval = "5m" | "15m" | "1h" | "4h" | "1d" | "1w";

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
