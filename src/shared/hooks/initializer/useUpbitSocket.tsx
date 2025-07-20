import { useEffect, useRef, useCallback } from "react";
import { toast } from "react-toastify";
import ReconnectingWebSocket from "reconnecting-websocket";
import useStore from "@/shared/stores/store";
import { isNetwork } from "@/shared/utils/network";
import LocalStorage from "@/shared/utils/storage";
import { generateUUID } from "@/shared/lib/uuid";
import { formatDate } from "@/shared/lib/date";
import { floorToDecimal } from "@/shared/utils/number";
import { isDev } from "@/shared/utils/common";

const UPBIT_URL = "wss://api.upbit.com/websocket/v1";
const UUID_STORAGE_KEY = "uuid";
const UPBIT_BTC_TICKER = "KRW-BTC";
const UPBIT_USDT_TICKER = "KRW-USDT";

const getUUID = () => {
  const stored = LocalStorage.getItem(UUID_STORAGE_KEY);
  if (stored) return stored;
  const newUUID = generateUUID();
  LocalStorage.setItem(UUID_STORAGE_KEY, newUUID);
  return newUUID;
};

const getRequestPayload = () => [
  { ticket: getUUID() },
  { type: "ticker", codes: [UPBIT_BTC_TICKER, UPBIT_USDT_TICKER] },
  { format: "SIMPLE" }
];


export default function useUpbitWebSocket() {

  // region [Hooks]
  const socketRef = useRef<ReconnectingWebSocket | null>(null);
  // endregion

  const resetKrwDisconnected = () => {
    const { bitcoinPrice, setBitcoinKrwPrice } = useStore.getState();
    setBitcoinKrwPrice({ ...bitcoinPrice, isKrwConnected: false });
  };

  const handleBTCUpdate = useCallback((price: number, krwUpdateTimestamp: number, krwChange24h: number) => {
    const { setBitcoinKrwPrice, setting } = useStore.getState();
    if (setting.currency.includes("KRW")) {
      const krwChange24hStr = floorToDecimal(krwChange24h * 100, 2).toString();
      setBitcoinKrwPrice({ krw: price, krwChange24h: krwChange24hStr, krwUpdateTimestamp, isKrwConnected: true });
    }
  }, []);

  const handleUSDTUpdate = useCallback((price: number, timestamp: number) => {
    const { setExRate, setting } = useStore.getState();
    if (setting.isUsdtStandard) {
      setExRate({ value: price, date: formatDate(timestamp) });
    }
  }, []);

  const connect = useCallback(() => {
    const socket = new ReconnectingWebSocket(UPBIT_URL, [], {
      maxReconnectionDelay: 8000,           // 재연결 최대 지연: 10초
      minReconnectionDelay: 1000,           // 재연결 최소 지연: 1초
      reconnectionDelayGrowFactor: 1.5,     // 재시도 간 딜레이 증가 비율
      minUptime: 5000,                      // 연결이 최소 유지되어야 하는 시간 (5초)
      connectionTimeout: 3000,              // 연결 시도 타임아웃: 4초
      maxRetries: 10,                       // 무한 재시도 (실서비스 기준)
      maxEnqueuedMessages: 100,             // 연결 안 된 동안 큐에 쌓을 메시지 수 제한
      startClosed: false,                   // 생성 직후 자동 연결
      debug: false                          // 디버깅 로그 출력 여부
    });

    socket.binaryType = "arraybuffer";

    socket.onopen = () => {
      toast.success("Upbit 연결됨");
      if (isDev) console.log("✅ 업비트 소켓 연결");
      socket.send(JSON.stringify(getRequestPayload()));
    };

    socket.onmessage = (evt) => {
      const enc = new TextDecoder("utf-8");
      const data = JSON.parse(enc.decode(new Uint8Array(evt.data)));

      if (data.cd === UPBIT_BTC_TICKER) {
        handleBTCUpdate(data.tp, data.ttms, data.scr);
      }
      if (data.cd === UPBIT_USDT_TICKER) {
        handleUSDTUpdate(data.tp, data.ttms);
      }
    };

    socket.onerror = (e) => {
      console.error("Upbit WebSocket Error:", e);
      if (!isNetwork()) {
        toast.warn("Upbit 연결 오류");
        socket.close();
      }
    };

    socket.onclose = (e) => {
      console.warn(`⛔ 업비트 소켓 종료: ${e.code}`);
      resetKrwDisconnected();
      if (e.wasClean || e.code === 1000) {
        console.log("🔌 서버 정상 종료(Upbit)");
      } else {
        console.log("🔁 재연결 시도중...");
      }
    };

    socketRef.current = socket;
  }, [handleBTCUpdate, handleUSDTUpdate]);

  const disconnect = useCallback(() => {
    socketRef.current?.close(1000);
    socketRef.current = null;
  }, []);

  const reconnect = useCallback(() => {
    disconnect();
    connect();
  }, [disconnect, connect]);

  useEffect(() => {
    connect();
    return disconnect;
  }, [connect, disconnect]);
};