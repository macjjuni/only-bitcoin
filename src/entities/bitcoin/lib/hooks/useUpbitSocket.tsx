import { useCallback, useEffect, useRef } from "react";
import ReconnectingWebSocket from "reconnecting-websocket";
import { createConnectionToast } from "@/shared/lib/connectionToast";
import { formatDate } from "@/shared/lib/date";
import { generateUUID } from "@/shared/lib/uuid";
import useSettingStore from "@/shared/stores/settingStore";
import { isDev } from "@/shared/utils/common";
import { floorToDecimal } from "@/shared/utils/number";
import LocalStorage from "@/shared/utils/storage";
import useBitcoinStore from "../../model/bitcoinStore";
import { UPBIT_MARKET_FLAG } from "../../model/market";

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
  { format: "SIMPLE" },
];

const notifyConnected = createConnectionToast("업비트 연결!");

export default function useUpbitSocket() {
  // region [Hooks]
  const krwMarket = useBitcoinStore((store) => store.krwMarket);
  const socketRef = useRef<ReconnectingWebSocket | null>(null);
  // endregion

  const resetKrwDisconnected = () => {
    const { bitcoinPrice, setBitcoinKrwPrice } = useBitcoinStore.getState();
    setBitcoinKrwPrice({ ...bitcoinPrice, isKrwConnected: false });
  };

  const handleBTCUpdate = useCallback(
    (price: number, krwUpdateTimestamp: number, krwChange24h: number) => {
      const { setBitcoinKrwPrice } = useBitcoinStore.getState();
      const { setting } = useSettingStore.getState();
      if (setting.currency.includes("KRW")) {
        const krwChange24hStr = floorToDecimal(krwChange24h * 100, 2).toString();
        setBitcoinKrwPrice({
          krw: price,
          krwChange24h: krwChange24hStr,
          krwUpdateTimestamp,
          isKrwConnected: true,
        });
      }
    },
    [],
  );

  const handleUSDTUpdate = useCallback((price: number, timestamp: number) => {
    const { setExRate } = useBitcoinStore.getState();
    const { setting } = useSettingStore.getState();
    if (setting.isUsdtStandard) {
      setExRate({ value: price, date: formatDate(timestamp) });
    }
  }, []);

  const connect = useCallback(() => {
    const socket = new ReconnectingWebSocket(UPBIT_URL, [], {
      maxReconnectionDelay: 8000, // 재연결 최대 지연: 8초
      minReconnectionDelay: 1000,
      // 1 이면 간격이 안 늘어 1초마다 영원히 다시 붙으려 함. 다른 소켓과 같이 8초까지 늘림.
      reconnectionDelayGrowFactor: 1.5, // 재시도 간 딜레이 증가 비율
      minUptime: 5000, // 연결이 최소 유지되어야 하는 시간 (5초)
      connectionTimeout: 3000, // 연결 시도 타임아웃: 3초
      maxEnqueuedMessages: 100, // 연결 안 된 동안 큐에 쌓을 메시지 수 제한
      // maxRetries 는 안 줌. 기본값이 무한 재시도라 끊겨도 계속 다시 붙음.
      startClosed: false, // 생성 직후 자동 연결
      debug: false, // 디버깅 로그 출력 여부
    });

    socket.binaryType = "arraybuffer";

    socket.onopen = () => {
      notifyConnected();
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
      console.warn("Upbit WebSocket Error:", e);
      // 여기서 close() 를 부르면 안 됨. 재연결이 꺼져서 네트워크가 돌아와도 안 붙었음.
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

  // region [Life Cycles]
  useEffect(() => {
    if (krwMarket === UPBIT_MARKET_FLAG) {
      connect();
    } else {
      disconnect();
    }

    return () => {
      disconnect();
    };
  }, [krwMarket, connect, disconnect]);
  // endregion
}
