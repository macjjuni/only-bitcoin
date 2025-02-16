import { toast } from "react-toastify";
import useStore from "@/shared/stores/store";
import { isNetwork } from "@/shared/utils/network";
import LocalStorage from "@/shared/utils/storage";
import { generateUUID } from "@/shared/utils/string";

// Upbit WebSocket Data
const UPBIT_URL = import.meta.env.VITE_UPBIT_API_URL || "wss://api.upbit.com/websocket/v1";
const UUID_STORAGE_KEY = "uuid";
const UPBIT_BTC_TICKER = "KRW-BTC" as const;
const UPBIT_USDT_TICKER = "KRW-USDT" as const;

// 재시도 관련 설정
const MAX_RETRIES = 3;
const RETRY_DELAY = 3000; // 3초

let retryCount = 0;
let timeout: NodeJS.Timeout | null = null;
let socket: WebSocket | null = null;

// UUID 가져오기
const getUUID = () => {
  const storedUUID = LocalStorage.getItem(UUID_STORAGE_KEY);
  if (storedUUID) return storedUUID;

  const newUUID = generateUUID();
  LocalStorage.setItem(UUID_STORAGE_KEY, newUUID);

  return newUUID;
};

// WebSocket 요청 데이터
const getRequestPayload = () => [
  { ticket: getUUID() },
  { type: "ticker", codes: [UPBIT_BTC_TICKER, UPBIT_USDT_TICKER] },
  { format: "SIMPLE" }
];

// 재연결 카운트 초기화
const resetRetry = () => {
  if (timeout) {
    clearTimeout(timeout);
    timeout = null;
  }
  retryCount = 0;
};

// BTC 가격 업데이트
const handleBTCUpdate = (price: number, krwUpdateTimestamp: number) => {

  const { setBitcoinKrwPrice, bitcoinPrice } = useStore.getState();

  if (bitcoinPrice.isKrwEnabled) {
    setBitcoinKrwPrice({ krw: price, krwUpdateTimestamp, isKrwConnected: true });
  }
};

// USDT 가격 업데이트
// const handleUSDTUpdate = (price: number, timestamp: number) => {
//   const { exRate, setExRate, isUsdtRateEnabled } = getState();
//
//   if (isUsdtRateEnabled && exRate.basePrice !== price) {
//     setExRate({ basePrice: price, date: formatDate(timestamp), provider: "Upbit(KRW/USDT)" });
//   }
// };

// WebSocket 이벤트 핸들링
const socketManager = {
  init: () => {
    socket = new WebSocket(UPBIT_URL);
    socket.binaryType = "arraybuffer";

    socket.onopen = () => {
      resetRetry();
      socket?.send(JSON.stringify(getRequestPayload()));
      toast.success(`서버에 연결되었습니다. (Upbit)`);
      console.log("✅ 업비트 소켓 연결 초기화");
    };

    socket.onmessage = (evt) => {

      const enc = new TextDecoder("utf-8");
      const data = JSON.parse(enc.decode(new Uint8Array(evt.data)));

      if (data.cd === UPBIT_BTC_TICKER) {
        handleBTCUpdate(data.tp, data.ttms);
      }

      // if (data.cd === UPBIT_USDT_TICKER) {
      //   handleUSDTUpdate(data.tp, data.ttms);
      // }
    };

    socket.onerror = (e) => {

      console.error(e);

      if (!isNetwork()) {
        toast.warn("인터넷 연결 오류 또는 서버 점검 중입니다. 나중에 다시 시도해 주세요 🙏");
        socket?.close();
      }
    };

    socket.onclose = (e) => {

      console.log(`⛔ 비정상적 종료(Upbit): ${e.code}`);

      const { bitcoinPrice, setBitcoinKrwPrice } = useStore.getState();
      setBitcoinKrwPrice({ ...bitcoinPrice, isKrwConnected: false }); // 연결 해제

      if (e.wasClean || e.code === 1000) {
        console.log("🔌 서버 연결 해제(Upbit)");
      } else if (e.code === 1006) {
        socketManager.handleReconnect();
      }
    };
  },

  handleReconnect: () => {
    timeout = setTimeout(() => {

      if (retryCount >= MAX_RETRIES) {
        resetRetry();
        toast.error("서버가 응답하지 않습니다. 나중에 다시 시도해주세요. (Upbit) 🙏");
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
export const disconnectUpbit = socketManager.disconnect;
export const reConnectUpbit = socketManager.reconnect;
