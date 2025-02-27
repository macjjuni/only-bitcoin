import { toast } from "react-toastify";
import { isNetwork } from "@/shared/utils/network";
import useStore from "@/shared/stores/store";
import { floorToDecimal } from "@/shared/utils/number";
import { comma } from "@/shared/utils/string";
import { isDev, setTitle } from "@/shared/utils/common";

// Binance WebSocket Data
const BINANCE_URL = `wss://stream.binance.com:9443/ws/btcusdt@ticker`;

// 재시도 관련 설정
const MAX_RETRIES = 3;
const RETRY_DELAY = 3000; // 3초

let retryCount = 0;
let timeout: NodeJS.Timeout | null = null;
let socket: WebSocket | null = null;

// 재연결 카운트 초기화
const resetRetry = () => {
  if (timeout) {
    clearTimeout(timeout);
    timeout = null;
  }
  retryCount = 0;
};

// BTC 가격 업데이트
const handleBTCUpdate = (price: number, usdUpdateTimestamp: number, usdChange24h: string) => {

  const { setBitcoinUsdPrice } = useStore.getState();
  const usdChange24hStr = floorToDecimal(Number(usdChange24h), 2).toString();

  setTitle(comma(price.toFixed(0)));
  setBitcoinUsdPrice({ usd: price, usdChange24h: usdChange24hStr, usdUpdateTimestamp, isUsdConnected: true });
};

// WebSocket 이벤트 핸들링
const socketManager = {
  init: () => {
    socket = new WebSocket(BINANCE_URL);
    socket.binaryType = "arraybuffer";

    socket.onopen = () => {
      resetRetry();
      toast.success(`서버에 연결되었습니다. (Binance)`);

      if (isDev) {
        console.log("✅ 바이낸스 소켓 연결 초기화");
      }
    };

    socket.onmessage = ({ data }) => {
      const json = JSON.parse(data);
      handleBTCUpdate(Number(json.c), json.C, json.P);
    };

    socket.onerror = (e) => {

      console.error(e);

      if (!isNetwork()) {
        toast.warn("인터넷 연결 오류 또는 서버 점검 중입니다. 나중에 다시 시도해 주세요 🙏");
        socket?.close();
      }
    };

    socket.onclose = (e) => {
      console.log(`⛔ 비정상적 종료(Binance): ${e.code}`);

      const { setBitcoinUsdPrice, bitcoinPrice } = useStore.getState();
      setBitcoinUsdPrice({ ...bitcoinPrice, isUsdConnected: false }); // 연결 해제

      if (e.wasClean || e.code === 1000) {
        console.log("🔌 서버 연결 해제(Binance)");
      } else if (e.code === 1006) {
        socketManager.handleReconnect();
      }
    };
  },

  handleReconnect: () => {
    timeout = setTimeout(() => {
      if (retryCount >= MAX_RETRIES) {
        resetRetry();
        toast.error("서버가 응답하지 않습니다. 나중에 다시 시도해주세요. (Binance) 🙏");
        return;
      }

      toast.info(`${RETRY_DELAY / 1000}초 후 재연결 시도합니다. (${retryCount + 1}/${MAX_RETRIES})`);
      retryCount++;
      socketManager.init();
    }, RETRY_DELAY);
  },

  disconnect: () => {
    if (!socket) return;
    resetRetry();
    socket.close(1000);
  },

  reconnect: () => {
    socketManager.disconnect();
    socketManager.init();
  }
};

// WebSocket 초기화
export default socketManager.init;
export const disconnectBinance = socketManager.disconnect;
export const reConnectBinance = socketManager.reconnect;
