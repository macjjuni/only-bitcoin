
export interface MarketChartResponseData {
  market_caps: Array<number[]>;
  prices: Array<number[]>;
  total_volumes: Array<number[]>;
}

export interface MarketChartFormattedData {
  price: number[];
  date: number[];
}
