
export interface MarketChartFormattedData {
  price: number[];
  date: number[];
}

/**
 * Binance Klines 응답 1행 구조
 * [openTime, open, high, low, close, volume, closeTime, ...]
 */
export type BinanceKline = [
  number, string, string, string, string, string, number, string, number, string, string, string,
];

export interface BlockchainChartResponseData {
  values: Array<{ x: number; y: number }>;
}
