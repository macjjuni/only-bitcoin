import { kToast } from "kku-ui";
import { useCallback, useEffect, useRef } from "react";
import ReconnectingWebSocket from "reconnecting-websocket";
import { isDev, setTitle } from "@/shared/utils/common";
import { isNetwork } from "@/shared/utils/network";
import { floorToDecimal } from "@/shared/utils/number";
import { comma } from "@/shared/utils/string";
import useBitcoinStore from "../../model/bitcoinStore";
import { COINBASE_MARKET_FLAG } from "../../model/market";

const COINBASE_URL = `wss://ws-feed.exchange.coinbase.com`;

export default function useCoinbaseSocket() {
  // region [Hooks]
  const usdMarket = useBitcoinStore((store) => store.usdMarket);
  const socketRef = useRef<ReconnectingWebSocket | null>(null);
  // endregion

  const resetUsdDisconnected = useCallback(() => {
    const { bitcoinPrice, setBitcoinUsdPrice } = useBitcoinStore.getState();
    setBitcoinUsdPrice({ ...bitcoinPrice, isUsdConnected: false });
  }, []);

  const handleBTCUpdate = useCallback(
    (price: number, usdUpdateTimestamp: number, usdChange24h: string) => {
      const { setBitcoinUsdPrice } = useBitcoinStore.getState();
      // 코인베이스는 퍼센트가 아니라 24시간 시가(open_24h)를 줌 -> 변동률 직접 계산 필요
      const usdChange24hStr = floorToDecimal(Number(usdChange24h), 2).toString();

      setTitle(comma(price.toFixed(0)));
      setBitcoinUsdPrice({
        usd: price,
        usdChange24h: usdChange24hStr,
        usdUpdateTimestamp,
        isUsdConnected: true,
      });
    },
    [],
  );

  const connect = useCallback(() => {
    const socket = new ReconnectingWebSocket(COINBASE_URL, [], {
      maxReconnectionDelay: 8000,
      minReconnectionDelay: 1000,
      reconnectionDelayGrowFactor: 1.5,
      minUptime: 5000,
      connectionTimeout: 3000,
      maxRetries: 10,
      maxEnqueuedMessages: 100,
      startClosed: false,
      debug: false,
    });

    socket.onopen = () => {
      kToast.success("코인베이스 연결!");
      if (isDev) console.log("✅ 코인베이스 소켓 연결");

      // [중요] 코인베이스는 연결 후 구독 메시지를 보내야 함
      const subscribeMsg = {
        type: "subscribe",
        product_ids: ["BTC-USD"],
        channels: ["ticker"],
      };
      socket.send(JSON.stringify(subscribeMsg));
    };

    socket.onmessage = ({ data }) => {
      try {
        const json = JSON.parse(data as string);

        if (json.type === "ticker" && json.price) {
          const currentPrice = Number(json.price);
          const open24h = Number(json.open_24h);

          // [계산] (현재가 - 24시간시가) / 24시간시가 * 100
          const changePercent = open24h ? ((currentPrice - open24h) / open24h) * 100 : 0;

          // Timestamp ISO string -> UNIX Timestamp 변환 필요시 처리
          const timestamp = new Date(json.time).getTime();

          handleBTCUpdate(currentPrice, timestamp, changePercent.toString());
        }
      } catch (e) {
        console.error("Coinbase Data Parse Error", e);
      }
    };

    socket.onerror = (e) => {
      console.error("Coinbase WebSocket Error:", e);
      kToast.error("코인베이스 연결 오류");

      if (!isNetwork()) {
        socket.close();
      }
    };

    socket.onclose = (e) => {
      console.warn(`⛔ 코인베이스 소켓 종료: ${e.code}`);
      resetUsdDisconnected();
      if (e.wasClean || e.code === 1000) {
        console.log("🔌 서버 정상 종료(Coinbase)");
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

  // region [Life Cycles]
  useEffect(() => {
    if (usdMarket === COINBASE_MARKET_FLAG) {
      connect();
    } else {
      disconnect();
    }

    return () => {
      disconnect();
    };
  }, [usdMarket, connect, disconnect]);
  // endregion
}
