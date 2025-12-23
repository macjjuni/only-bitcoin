import {useCallback, useEffect, useRef} from 'react'
import {kToast} from "kku-ui";
import ReconnectingWebSocket from 'reconnecting-websocket'
import useStore from '@/shared/stores/store'
import {isNetwork} from '@/shared/utils/network'
import LocalStorage from '@/shared/utils/storage'
import {generateUUID} from '@/shared/lib/uuid'
import {formatDate} from '@/shared/lib/date'
import {floorToDecimal} from '@/shared/utils/number'
import {isDev} from '@/shared/utils/common'
import {BITHUMB_MARKET_FLAG} from '@/shared/constants/market'

const BITHUMB_URL = "wss://ws-api.bithumb.com/websocket/v1";
const UUID_STORAGE_KEY = "uuid";
const BITHUMB_BTC_TICKER = "KRW-BTC";
const BITHUMB_USDT_TICKER = "KRW-USDT";

const getUUID = () => {
  const stored = LocalStorage.getItem(UUID_STORAGE_KEY);
  if (stored) return stored;
  const newUUID = generateUUID();
  LocalStorage.setItem(UUID_STORAGE_KEY, newUUID);
  return newUUID;
};

const getRequestPayload = () => [
  { ticket: getUUID() },
  { type: "ticker", codes: [BITHUMB_BTC_TICKER, BITHUMB_USDT_TICKER] },
  { format: "SIMPLE" }
];

export default function useBithumbWebSocket() {
  // region [Hooks]
  const krwMarket = useStore(store => store.krwMarket);
  const setReconnectBithumb = useStore(state => state.setReconnectBithumb);
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
    const socket = new ReconnectingWebSocket(BITHUMB_URL, [], {
      maxReconnectionDelay: 8000,
      minReconnectionDelay: 1000,
      reconnectionDelayGrowFactor: 1.5,
      minUptime: 5000,
      connectionTimeout: 3000,
      maxRetries: 10,
      maxEnqueuedMessages: 100,
      startClosed: false,
      debug: false
    });
    socket.binaryType = "arraybuffer";

    socket.onopen = () => {
      kToast.success("빗썸 연결!");
      if (isDev) console.log("✅ 빗썸 소켓 연결");
      socket.send(JSON.stringify(getRequestPayload()));
    };

    socket.onmessage = (evt) => {
      const decoder = new TextDecoder("utf-8");
      const dataString = decoder.decode(evt.data);

      try {
        const data = JSON.parse(dataString);

        if (data?.ty === "ticker" && data.cd === BITHUMB_BTC_TICKER) {
          handleBTCUpdate(data.tp , data.tms, data.scr);
        }
        if (data?.ty === "ticker" && data.cd === BITHUMB_USDT_TICKER) {
          handleUSDTUpdate(data.tp, data.tms);
        }
      } catch (error) {
        console.error("JSON 파싱 오류:", error);
      }
    };

    socket.onerror = (e) => {
      console.error("Bithumb WebSocket Error:", e);
      kToast.error("빗썸 연결 오류");

      if (!isNetwork()) {
        socket.close();
      }
    };

    socket.onclose = (e) => {
      console.warn(`⛔ 빗썸 소켓 종료: ${e.code}`);
      resetKrwDisconnected();
      if (e.wasClean || e.code === 1000) {
        console.log("🔌 서버 정상 종료(Bithumb)");
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

  // region [Life Cycles]
  useEffect(() => {
    setReconnectBithumb(reconnect);
  }, [reconnect]);

  useEffect(() => {
    if (krwMarket === BITHUMB_MARKET_FLAG) {
      connect();
    } else {
      disconnect();
    }

    return () => { disconnect(); };
  }, [krwMarket, connect, disconnect]); // krwMarket 값에 따라 연결/해제
  // endregion
}
