import { keepPreviousData, useQuery } from "@tanstack/react-query";
import type { BtcCandle } from "../model/market";
import { fetchBinanceCandles } from "./binance";

/** 30분봉 48개 = 24시간. 전광판 폭에서 캔들이 뭉개지지 않는 개수임. */
export const BTC_CANDLE_INTERVAL = "30m";
export const BTC_CANDLE_COUNT = 48;

/**
 * 지난 캔들을 다시 받는 간격.
 *
 * 진행 중인 봉은 웹소켓(`useBtcLiveCandles`)이 2초마다 밀어 줌. 이 조회는
 * 첫 화면과 소켓이 끊겼던 사이를 메우는 용도라 5분이면 충분함.
 */
const REFRESH_TIME_MS = 1000 * 60 * 5;

const EMPTY_CANDLES: BtcCandle[] = [];

const fetchBtcCandles = async (): Promise<BtcCandle[]> => {
  try {
    return await fetchBinanceCandles(BTC_CANDLE_INTERVAL, BTC_CANDLE_COUNT);
  } catch (error) {
    console.warn("❌ 바이낸스 캔들 조회 실패", error);
    return EMPTY_CANDLES;
  }
};

/** BTCUSDT 최근 24시간 캔들. 스페이스 전광판 차트에 씀. */
const useBtcCandlesQuery = () => {
  return useQuery<BtcCandle[]>({
    queryKey: ["btc-candles-24h", BTC_CANDLE_INTERVAL, BTC_CANDLE_COUNT],
    queryFn: fetchBtcCandles,
    staleTime: REFRESH_TIME_MS,
    refetchInterval: REFRESH_TIME_MS,
    refetchOnWindowFocus: false,
    placeholderData: keepPreviousData,
  });
};

export default useBtcCandlesQuery;
