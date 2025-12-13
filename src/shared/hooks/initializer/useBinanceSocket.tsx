import { useEffect, useRef, useCallback } from "react";
import { toast } from "react-toastify";
import ReconnectingWebSocket from "reconnecting-websocket";
import useStore from "@/shared/stores/store";
import { isNetwork } from "@/shared/utils/network";
import { floorToDecimal } from "@/shared/utils/number";
import { comma } from "@/shared/utils/string";
import { isDev, setTitle } from "@/shared/utils/common";
import { BINANCE_MARKET_FLAG } from "@/shared/constants/market";

const BINANCE_URL = `wss://stream.binance.com:9443/ws/btcusdt@ticker`;

export default function useBinanceWebSocket() {

  // region [Hooks]
  const usdMarket = useStore(store => store.usdMarket);
  const socketRef = useRef<ReconnectingWebSocket | null>(null);
  const setReconnectBinance = useStore(state => state.setReconnectBinance);
  // endregion

  const resetUsdDisconnected = useCallback(() => {
    const { bitcoinPrice, setBitcoinUsdPrice } = useStore.getState();
    setBitcoinUsdPrice({ ...bitcoinPrice, isUsdConnected: false });
  }, []);

  const handleBTCUpdate = useCallback((price: number, usdUpdateTimestamp: number, usdChange24h: string) => {
    const { setBitcoinUsdPrice } = useStore.getState();
    const usdChange24hStr = floorToDecimal(Number(usdChange24h), 2).toString();

    setTitle(comma(price.toFixed(0)));
    setBitcoinUsdPrice({ usd: price, usdChange24h: usdChange24hStr, usdUpdateTimestamp, isUsdConnected: true });
  }, []);

  const connect = useCallback(() => {
    const socket = new ReconnectingWebSocket(BINANCE_URL, [], {
      maxReconnectionDelay: 8000,           // 재연결 최대 지연: 10초
      minReconnectionDelay: 1000,           // 재연결 최소 지연: 1초
      reconnectionDelayGrowFactor: 1.5,     // 재시도 간 딜레이 증가 비율
      minUptime: 5000,                      // 연결이 최소 유지되어야 하는 시간 (5초)
      connectionTimeout: 3000,              // 연결 시도 타임아웃: 4초
      maxRetries: 10,                       // 10회 재시도 (실서비스 기준)
      maxEnqueuedMessages: 100,             // 연결 안 된 동안 큐에 쌓을 메시지 수 제한
      startClosed: false,                   // 생성 직후 자동 연결
      debug: false                          // 디버깅 로그 출력 여부
    });

    socket.binaryType = "arraybuffer";

    socket.onopen = () => {
      toast.success("바이낸스 연결!");
      if (isDev) console.log("✅ 바이낸스 소켓 연결");
    };

    socket.onmessage = ({ data }) => {
      try {
        // [안전성] 데이터 파싱 에러 핸들링
        const json = JSON.parse(data as string);
        if (json?.c) {
          handleBTCUpdate(Number(json.c), json.C, json.P);
        }
      } catch (e) {
        console.error("Binance Data Parse Error", e);
      }
    };

    socket.onerror = (e) => {
      console.error("Binance WebSocket Error:", e);
      toast.error("바이낸스 연결 오류");

      if (!isNetwork()) {
        socket.close();
      }
    };

    socket.onclose = (e) => {
      console.warn(`⛔ 바이낸스 소켓 종료: ${e.code}`);
      resetUsdDisconnected();
      if (e.wasClean || e.code === 1000) {
        console.log("🔌 서버 정상 종료(Binance)");
      } else {
        console.log("🔁 재연결 시도중...");
      }
    };

    socketRef.current = socket;
  }, [handleBTCUpdate, resetUsdDisconnected]);

  const disconnect = useCallback(() => {
    socketRef.current?.close(1000);
    socketRef.current = null;
  }, []);

  const reconnect = useCallback(() => {
    disconnect();
    connect();
  }, [disconnect, connect]);


  // region [Life Cycles]
  useEffect(() => {
    setReconnectBinance(reconnect);
  }, [reconnect]);

  useEffect(() => {
    if (usdMarket === BINANCE_MARKET_FLAG) {
      connect();
    } else {
      disconnect();
    }

    return () => {
      disconnect();
    };
  }, [usdMarket, connect, disconnect]);
  // endregion
};
