import { toast } from "react-toastify";
import useStore from "@/shared/stores/store";
import { deepEqual } from "@/shared/utils/common";
import { MemPoolBlockTypes } from "@/shared/types/block.interface";
import { BlockTypes, FeesTypes } from "@/shared/stores/store.interface";

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

// 멤풀 블록 리스트 업데이트
const handleMempoolBlocks = (blocks: MemPoolBlockTypes[]) => {

  const { setBlockData } = useStore.getState();
  const sanitizedBlocks: BlockTypes[] = blocks.map(({id, height, timestamp, size, extras}) => ({
    id, height, timestamp, size, poolName: extras.pool.name
  })).sort((a, b) => b.timestamp - a.timestamp);

  setBlockData(sanitizedBlocks);
};

// 새롭게 채굴 된 블록 업데이트
const handleMempoolBlock = (block: MemPoolBlockTypes) => {

  const { blockData, setBlockData } = useStore.getState();

  const isContained = blockData.filter(blockItem => blockItem.height === block.height).length > 0;

  // 이미 블록 데이터에 블록이 있는 경우
  if (isContained) { return; }

  const { id, height, size, timestamp, extras} = block;
  const sanitizedBlock: BlockTypes = { id, height, size, timestamp, poolName: extras.pool.name }

  setBlockData([sanitizedBlock, ...blockData]);
};

const handleMempoolFees = (resFees: FeesTypes) => {

  const { fees, setFees } = useStore.getState();
  if (!deepEqual(fees, resFees)) {
    setFees(resFees);
  }
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
      socket?.send(JSON.stringify({ action: "want", data: ["blocks", "stats"] }));
    };

    socket.onmessage = ({ data }) => {

      const mempoolData = JSON.parse(data);

      if (mempoolData?.blocks) {
        handleMempoolBlocks(mempoolData.blocks);
      }
      if (mempoolData?.block) {
        handleMempoolBlock(mempoolData.block);
      }

      if (mempoolData?.fees) {
        handleMempoolFees(mempoolData?.fees)
      }
    };

    socket.onerror = (e) => {
      console.error("🔴 WebSocket 오류:", e);
    };

    socket.onclose = (e) => {
      console.log(`⛔ WebSocket 종료 (코드: ${e.code})`);
      console.error(e);

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



// WebSocket 초기화
export default socketManager.init;
export const disconnectMempool = socketManager.disconnect;
export const reconnectMempool = socketManager.reconnect;
