import { toast } from "react-toastify";
import useStore from "@/shared/stores/store";
import { getNextHalvingData } from "@/shared/utils/common";

const MEMPOOL_WS_URL = "wss://mempool.space/api/v1/ws";
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

// BTC 가격 데이터 업데이트
const handleMempoolData = (blocks: MempoolResponseTypes[]) => {

  const { height, timestamp } = blocks[blocks.length-1];
  const { setBlockData } = useStore.getState();
  const {blockHeight} = getNextHalvingData(height) || { blockHeight: 0 };

  console.log(blockHeight - height);

  setBlockData({
    height,
    timestamp,
    halvingPercent: 0,
    nextHalving: {
      nextHalvingHeight: blockHeight || 0,
      nextHalvingPredictedDate: 0,
      remainingHeight: blockHeight - height,
    }
  });
};

// WebSocket 이벤트 핸들링
const socketManager = {

  init: () => {

    socket = new WebSocket(MEMPOOL_WS_URL);
    socket.binaryType = "arraybuffer";

    socket.onopen = () => {

      resetRetry();
      toast.success(`서버에 연결되었습니다. (Mempool)`);
      console.log("✅ Mempool 소켓 연결 초기화");

      // 데이터 구독 요청
      socket?.send(JSON.stringify({ action: "want", data: ["blocks"] }));
    };

    socket.onmessage = ({ data }) => {

      const mempoolData = JSON.parse(data);

      if (mempoolData?.blocks) {
        handleMempoolData(mempoolData.blocks);
      }
    };

    socket.onerror = (e) => {
      console.error("🔴 WebSocket 오류:", e);
    };

    socket.onclose = (e) => {
      console.log(`⛔ WebSocket 종료 (코드: ${e.code})`);

      const { setBitcoinUsdPrice, bitcoinPrice } = useStore.getState();
      setBitcoinUsdPrice({ ...bitcoinPrice, isUsdConnected: false }); // 연결 해제

      if (e.wasClean || e.code === 1000) {
        console.log("🔌 정상적으로 서버 연결 종료");
      } else {
        socketManager.handleReconnect();
      }
    };
  },

  handleReconnect: () => {

    if (retryCount >= MAX_RETRIES) {
      resetRetry();
      toast.error("서버가 응답하지 않습니다. 나중에 다시 시도해주세요. (Mempool) 🙏");
      return;
    }

    timeout = setTimeout(() => {
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


interface MempoolResponseTypes {
  height: number,
  timestamp: number,
}


// WebSocket 초기화
export default socketManager.init;
export const disconnectMempool = socketManager.disconnect;
export const reconnectMempool = socketManager.reconnect;
