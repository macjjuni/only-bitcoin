import { keepPreviousData, useQuery } from "@tanstack/react-query";
import type { BtcCandle } from "../model/market";
import { fetchBinanceCandles } from "./binance";

/** 30분봉 48개 = 24시간. 전광판 폭에서 캔들이 뭉개지지 않는 개수임. */
const CANDLE_INTERVAL = "30m";
const CANDLE_COUNT = 48;

/** 마지막 캔들이 계속 자라서 1분마다 다시 받음. */
const REFRESH_TIME_MS = 1000 * 60;

const EMPTY_CANDLES: BtcCandle[] = [];

const fetchBtcCandles = async (): Promise<BtcCandle[]> => {
  try {
    return await fetchBinanceCandles(CANDLE_INTERVAL, CANDLE_COUNT);
  } catch (error) {
    console.warn("❌ 바이낸스 캔들 조회 실패", error);
    return EMPTY_CANDLES;
  }
};

/** BTCUSDT 최근 24시간 캔들. 스페이스 전광판 차트에 씀. */
const useBtcCandlesQuery = () => {
  return useQuery<BtcCandle[]>({
    queryKey: ["btc-candles-24h", CANDLE_INTERVAL, CANDLE_COUNT],
    queryFn: fetchBtcCandles,
    staleTime: REFRESH_TIME_MS,
    refetchInterval: REFRESH_TIME_MS,
    refetchOnWindowFocus: false,
    placeholderData: keepPreviousData,
  });
};

export default useBtcCandlesQuery;
