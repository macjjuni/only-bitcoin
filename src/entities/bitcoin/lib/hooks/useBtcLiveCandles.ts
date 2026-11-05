import { type RefObject, useEffect, useRef } from "react";
import ReconnectingWebSocket from "reconnecting-websocket";
import { isDev } from "@/shared/utils/common";
import {
  BTC_CANDLE_COUNT,
  BTC_CANDLE_INTERVAL,
  default as useBtcCandlesQuery,
} from "../../api/useBtcCandlesQuery";
import type { BtcCandle } from "../../model/market";
import { mergeCandleHistory, mergeLiveCandle, parseBinanceKlineMessage } from "../btcCandles";

/** 진행 중 봉을 2초마다 밀어 주는 바이낸스 kline 스트림. */
const BINANCE_KLINE_URL = `wss://stream.binance.com:9443/ws/btcusdt@kline_${BTC_CANDLE_INTERVAL}`;

export interface BtcLiveCandles {
  /** 최신 캔들 목록. 프레임 루프에서 읽어서 상태가 아니라 ref 임. */
  candlesRef: RefObject<readonly BtcCandle[]>;
  /** 목록이 바뀔 때마다 1 씩 오름. 다시 그릴지 가리는 데 씀. */
  versionRef: RefObject<number>;
}

const EMPTY_CANDLES: readonly BtcCandle[] = [];

/**
 * BTCUSDT 캔들 실시간 구독.
 *
 * 지난 48개는 REST(`useBtcCandlesQuery`)로 받고, 진행 중 봉은 웹소켓으로 받아
 * 덮어씀. 2초마다 마지막 봉이 자라고 30분이 지나면 새 봉이 바로 붙음.
 *
 * 상태로 올리지 않고 ref 로 돌려줌. 2초마다 리렌더하면 씬 전체가 다시 그려짐.
 * 쓰는 쪽(`/space` 전광판)이 사라지면 소켓도 닫힘.
 */
// biome-ignore format: AGENTS.md requires two blank lines between regions.
export default function useBtcLiveCandles(): BtcLiveCandles {
  // region [Hooks]
  const { data: history } = useBtcCandlesQuery();
  const candlesRef = useRef<readonly BtcCandle[]>(EMPTY_CANDLES);
  const versionRef = useRef<number>(0);
  /** 소켓이 마지막으로 준 봉. REST 가 다시 와도 이 값으로 덮어 차트가 뒤로 안 튐. */
  const liveCandleRef = useRef<BtcCandle | null>(null);
  // endregion


  // region [Privates]
  const replaceCandles = (nextCandles: readonly BtcCandle[]): void => {
    candlesRef.current = nextCandles;
    versionRef.current += 1;
  };
  // endregion


  // region [Life Cycles]
  useEffect(() => {
    if (!history || history.length === 0) {
      return;
    }

    replaceCandles(mergeCandleHistory(history, liveCandleRef.current, BTC_CANDLE_COUNT));
  }, [history]);

  useEffect(() => {
    const socket = new ReconnectingWebSocket(BINANCE_KLINE_URL, [], {
      maxReconnectionDelay: 8000,
      minReconnectionDelay: 1000,
      reconnectionDelayGrowFactor: 1.5,
      connectionTimeout: 3000,
      maxRetries: 10,
    });

    socket.onopen = () => {
      if (isDev) console.log("✅ 바이낸스 캔들 소켓 연결");
    };

    socket.onmessage = ({ data }) => {
      try {
        const liveCandle = parseBinanceKlineMessage(JSON.parse(String(data)));

        if (!liveCandle) {
          return;
        }

        liveCandleRef.current = liveCandle;
        // 지난 캔들이 아직 없으면 붙이지 않음. 봉 하나짜리 차트가 잠깐 뜨면 어색함.
        if (candlesRef.current.length > 0) {
          replaceCandles(mergeLiveCandle(candlesRef.current, liveCandle, BTC_CANDLE_COUNT));
        }
      } catch (error) {
        console.warn("❌ 바이낸스 캔들 메시지 파싱 실패", error);
      }
    };

    socket.onerror = (event) => {
      console.warn("Binance Kline WebSocket Error:", event);
    };

    return () => {
      socket.close(1000);
    };
  }, []);
  // endregion

  return { candlesRef, versionRef };
}
