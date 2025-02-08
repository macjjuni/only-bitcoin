import { toast } from "react-toastify";
import { useBearStore } from "@/store";
import { btcInfo } from "@/data/btcInfo";
import { isNetwork } from "@/utils/network";
import { generateUUID } from "@/utils/string";
import LocalStorage from "@/utils/storage";
import { formatDate } from "@/utils/date";

// Upbit API URL
const upbitURL = import.meta.env.VITE_UPBIT_API_URL || "wss://api.upbit.com/websocket/v1";
const uuidStorageKey = "uuid";

// Zustand
const { getState } = useBearStore;

// Uuid
const uuidValue = LocalStorage.getItem(uuidStorageKey);
const getUUID = () => {
  if (!uuidValue) {
    const newUuid = generateUUID();
    LocalStorage.setItem(uuidStorageKey, newUuid);

    return newUuid;
  }
  return uuidValue;
};

// etc
const usdtTicker = "KRW-USDT" as const;

const currency = [{ ticket: getUUID() }, { type: "ticker", codes: [btcInfo.ticker, usdtTicker] }, { format: "SIMPLE" }];

let timeout: NodeJS.Timeout | null = null;
let retryCount = 1;
const limitCount = 3;
const setTime = 3000; // ms 재시도 시간 간격

const clearTimeOut = () => {
  if (!timeout) return;
  clearTimeout(timeout);
  timeout = null;
  // 제한 횟숨만큼 연결 재시도
  retryCount = 0;
};

// 소켓 생성
let socket: WebSocket | null = null;

// 소켓 초기화
function initUpbit() {
  socket = new WebSocket(upbitURL);
  socket.binaryType = "arraybuffer";

  // eslint-disable-next-line func-names
  socket.onopen = function() {
    clearTimeOut();
    retryCount = 1;
    this.send(JSON.stringify(currency));
    toast.success(`서버에 연결되었습니다. (Upbit)`);
    console.log("✅ 업비트 소켓 연결 초기화");
  };

  socket.onmessage = (evt) => {

    const { updateKRW, exRate, setExRate, isUsdtRateEnabled } = getState();

    const enc = new TextDecoder("utf-8");
    const arr = new Uint8Array(evt.data);
    const data = JSON.parse(enc.decode(arr));

    const { cd, tp, ttms } = data;

    // KRW-BTC
    if (cd === btcInfo.ticker) {
      const btcPrice = tp;
      const krwDate = formatDate(ttms);
      const beforeBtcPrice = getState().btc.krw;

      if (btcPrice > beforeBtcPrice) {
        updateKRW({ krw: btcPrice, krwDate, krwColor: true, isKrwStatus: true });
      } else if (btcPrice < beforeBtcPrice) {
        updateKRW({ krw: btcPrice, krwDate, krwColor: false, isKrwStatus: true });
      }
    }

    // KRW-USDT
    const isUsdt = cd === usdtTicker;

    if (isUsdtRateEnabled && isUsdt && exRate.basePrice !== tp) {
      setExRate({ basePrice: tp, date: formatDate(ttms), provider: "Upbit(KRW/USDT)" });
    }
  };
  // 소켓 에러 핸들링
  socket.onerror = (e) => {
    console.dir(e);

    if (socket === null) return;
    if (!isNetwork()) {
      toast.warn(`인터넷 연결 오류 또는 서버 점검 중입니다. 나중에 다시 시도해 주세요 🙏`);
      socket.close();
    }
  };
  // 소켓 닫힘
  socket.onclose = (e) => {
    console.log(e);
    console.dir(`비정상적 종료(Upbit): ${e.code}`);
    getState().updateKRW({ ...getState().btc, isKrwStatus: false });

    if (e.wasClean || e.code === 1000) {
      console.log(`서버 연결 해제(Upbit)`);
    } else if (e.code === 1006) {
      // 비정상적 오류
      timeout = setTimeout(() => {
        toast.info(`${setTime / 1000}초 후 재연결 시도합니다. (${retryCount++})`);
        if (retryCount > limitCount) {
          // 제한 횟숨만큼 연결 재시도
          clearTimeOut();
          toast.error(`서버가 응답하지 않습니다. 나중에 다시 시도해주세요. (Upbit) 🙏`);
        } else {
          initUpbit();
        }
      }, setTime);
    }
  };
}

// 접속 해제
export const disconnectUpbit = () => {
  if (!socket) return;
  clearTimeOut();
  socket.close(1000);
};

export const reConnectUpbit = () => {
  disconnectUpbit();
  initUpbit();
}

export default initUpbit;
