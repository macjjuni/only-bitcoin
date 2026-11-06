import fetcher from "@/shared/utils/fetcher";
import type { BinanceKline, BtcCandle, MarketChartFormattedData } from "../model/market";

const BINANCE_KLINES_URL = "https://api.binance.com/api/v3/klines";
const BINANCE_TICKER_24H_URL = "https://api.binance.com/api/v3/ticker/24hr";

// `1m` 은 스페이스 배경음악이 급등락 판정 창(15분)을 즉시 채우는 데만 씀.
export type BinanceInterval =
  | "1m"
  | "5m"
  | "15m"
  | "30m"
  | "1h"
  | "4h"
  | "12h"
  | "1d"
  | "1w";

/**
 * Binance 24시간 티커 응답 ( 가격·수량 계열 필드는 모두 문자열로 내려온다 )
 * - highPrice / lowPrice: 롤링 24시간 고가 / 저가
 * - volume: BTC 수량 기준 거래량
 * - quoteVolume: USDT 금액 기준 거래대금
 */
export interface Binance24hTickerResponse {
  symbol: string;
  lastPrice: string;
  priceChange: string;
  priceChangePercent: string;
  highPrice: string;
  lowPrice: string;
  volume: string;
  quoteVolume: string;
  openTime: number;
  closeTime: number;
}

/**
 * BTCUSDT 롤링 24시간 티커 조회
 *
 * 업비트 티커의 고가/저가는 KST 자정 기준 "당일" 값이라 자정 직후 리셋되는 반면,
 * 이 엔드포인트는 호출 시점부터 24시간을 거슬러 올라가는 롤링 윈도우 값을 반환한다.
 */
export async function fetchBinance24hTicker(): Promise<Binance24hTickerResponse> {
  const searchParams = new URLSearchParams({ symbol: "BTCUSDT" });

  return fetcher<Binance24hTickerResponse>(`${BINANCE_TICKER_24H_URL}?${searchParams.toString()}`);
}

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
