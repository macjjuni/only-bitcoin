import { useEffect, useRef, useCallback } from "react";
import { toast } from "react-toastify";
import ReconnectingWebSocket from "reconnecting-websocket";
import useStore from "@/shared/stores/store";
import { deepEqual } from "@/shared/utils/common";
import { comma } from "@/shared/utils/string";
import { MemPoolBlockTypes } from "@/shared/types/block.interface";
import { BlockTypes, FeesTypes } from "@/shared/stores/store.interface";

const MEMPOOL_WS_URL = "wss://mempool.space/api/v1/ws";


export default function useMempoolSocket() {

  const socketRef = useRef<ReconnectingWebSocket | null>(null);

  const handleMempoolBlocks = useCallback((blocks: MemPoolBlockTypes[]) => {
    const { setBlockData } = useStore.getState();
    const sanitizedBlocks: BlockTypes[] = blocks
      .map(({ id, height, timestamp, size, extras }) => ({
        id,
        height,
        timestamp,
        size,
        poolName: extras.pool.name,
      }))
      .sort((a, b) => b.height - a.height);

    setBlockData(sanitizedBlocks);
  }, []);

  const handleMempoolBlock = useCallback((block: MemPoolBlockTypes) => {
    const { blockData, setBlockData } = useStore.getState();

    const isContained = blockData.some((blockItem) => blockItem.height === block.height);
    if (isContained) return;

    const { id, height, size, timestamp, extras } = block;
    const sanitizedBlock: BlockTypes = { id, height, size, timestamp, poolName: extras.pool.name };

    toast.info(`${comma(height)}번째 블록 채굴!️`);

    setBlockData([sanitizedBlock, ...blockData]);
  }, []);

  const handleMempoolFees = useCallback((resFees: FeesTypes) => {
    const { fees, setFees } = useStore.getState();
    if (!deepEqual(fees, resFees)) {
      setFees(resFees);
    }
  }, []);

  const connect = useCallback(() => {
    const socket = new ReconnectingWebSocket(MEMPOOL_WS_URL, [], {
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
      toast.success("Mempool 연결!");
      if (process.env.NODE_ENV === "development") {
        console.log("✅ Mempool 소켓 연결");
      }
      socket.send(JSON.stringify({ action: "want", data: ["blocks", "stats"] }));
    };

    socket.onmessage = ({ data }) => {
      const mempoolData = JSON.parse(data.toString());

      if (mempoolData?.blocks) {
        handleMempoolBlocks(mempoolData.blocks);
      }
      if (mempoolData?.block) {
        handleMempoolBlock(mempoolData.block);
      }
      if (mempoolData?.fees) {
        handleMempoolFees(mempoolData.fees);
      }
    };

    socket.onerror = (e) => {
      console.error("🔴 Mempool WebSocket 오류:", e);
    };

    socket.onclose = (e) => {
      console.warn(`⛔ Mempool 소켓 종료: ${e.code}`);
      if (e.wasClean || e.code === 1000) {
        console.log("🔌 정상 종료(Mempool)");
      } else {
        console.log("🔁 재연결 시도 중...");
      }
    };

    socketRef.current = socket;
  }, [handleMempoolBlocks, handleMempoolBlock, handleMempoolFees]);

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

  return { reconnect };
};