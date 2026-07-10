"use client";

export { default as useBitcoinDominanceQuery } from "./api/useDominanceQuery";
export { default as useFearGreedIndex } from "./api/useFearGreedIndexQuery";
export { default as useMarketChartData } from "./api/useMarketChartQuery";
export { default as usePriceMiniChartData } from "./api/usePriceMiniChartQuery";
export {
  useBinanceSocket,
  useBithumbSocket,
  useCoinbaseSocket,
  useUpbitSocket,
  useUsdExchangeRate,
} from "./lib/hooks";
