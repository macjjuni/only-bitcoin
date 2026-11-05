import { keepPreviousData, useQuery } from "@tanstack/react-query";
import type { BtcCandle } from "../model/market";
import { fetchBinanceCandles } from "./binance";

/** 30분봉 48개 = 24시간. 전광판 폭에서 캔들이 뭉개지지 않는 개수임. */
export const BTC_CANDLE_INTERVAL = "30m";
export const BTC_CANDLE_COUNT = 48;

/** 한 봉의 길이(ms). 소켓 봉과 지난 봉 사이가 벌어졌는지 재는 데 씀. */
export const BTC_CANDLE_INTERVAL_MS = 30 * 60 * 1000;

/**
 * 지난 캔들을 다시 받는 간격.
 *
 * 진행 중인 봉은 웹소켓(`useBtcLiveCandles`)이 2초마다 밀어 줌. 이 조회는
 * 첫 화면과 소켓이 끊겼던 사이를 메우는 용도임. 5분이면 충분하다고 봤는데,
 * 탭이 숨은 동안 타이머가 멈춰 몇 시간 전 24시간이 그대로 남는 일이 있어
 * 1분으로 줄였음. 48행짜리 응답이라 비용은 거의 없음.
 */
const REFRESH_TIME_MS = 1000 * 60;

/** 실패하면 지수 백오프로 다시 받는 횟수. 1·2·4·8·16초 뒤에 재시도함. */
const RETRY_COUNT = 5;

/**
 * 실패를 삼키지 않고 던짐.
 *
 * 빈 배열로 돌려주면 react-query 가 성공으로 보고 재시도를 안 해서, 다음 정기
 * 조회까지 차트가 "불러오는 중" 으로 남았음.
 */
const fetchBtcCandles = (): Promise<BtcCandle[]> => {
  return fetchBinanceCandles(BTC_CANDLE_INTERVAL, BTC_CANDLE_COUNT);
};

/** BTCUSDT 최근 24시간 캔들. 스페이스 전광판 차트에 씀. */
const useBtcCandlesQuery = () => {
  return useQuery<BtcCandle[]>({
    queryKey: ["btc-candles-24h", BTC_CANDLE_INTERVAL, BTC_CANDLE_COUNT],
    queryFn: fetchBtcCandles,
    /**
     * 캐시를 믿지 않고 항상 새로 받음.
     *
     * 전광판은 들어올 때마다 지금 이 순간의 24시간을 보여 줘야 함. 캐시를 두면
     * `/space` 에 다시 들어왔을 때 지난 목록이 먼저 깔리고, 그 위에 소켓이 현재
     * 봉만 얹어 마지막 한 칸이 뚝 끊긴 차트가 나왔음.
     */
    staleTime: 0,
    refetchOnMount: "always",
    refetchOnWindowFocus: true,
    refetchInterval: REFRESH_TIME_MS,
    placeholderData: keepPreviousData,
    retry: RETRY_COUNT,
    retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 16_000),
  });
};

export default useBtcCandlesQuery;
