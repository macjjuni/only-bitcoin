import { useCallback, useEffect, useLayoutEffect } from "react";
import { dateUtil } from "kku-util";
import { INIT_SOCKET_TIME } from "@/shared/constants/setting";
import storage from "@/shared/utils/storage";
import {
  initializeBinance, initializeFearGreedIndex,
  initializeMempool, initializeUpbit, reConnectUpbit, reConnectBinance, reconnectMempool
} from "@/shared/api";


export default function useInitializeAPI() {


  // region [Privates]

  const checkReconnectTime = () => {

    const leaveTime = Number(storage.getItem(INIT_SOCKET_TIME)); // 문자열 -> 숫자로 변환
    if (!leaveTime && leaveTime !== 0) return true; // NaN, null, undefined 체크

    const diffTime = dateUtil.calcCurrentDateDifference(leaveTime, "minute");
    return diffTime > 0;
  };

  const initializeSocket = useCallback(() => {

    window.addEventListener("visibilitychange", () => {

      if (document.hidden) {
        // 사용자가 홈 화면으로 이동
        storage.setItem(INIT_SOCKET_TIME, Date.now().toString());
      } else {
        // 사용자가 앱으로 돌아옴

        if (!checkReconnectTime()) {
          return;
        }

        reConnectUpbit();
        reConnectBinance();
        reconnectMempool();
      }
    });
  }, []);

  // endregion


  // region [Life Cycles]

  // 시작 페이지 로직
  useEffect(() => {
    initializeSocket();
  }, []);

  useLayoutEffect(() => {
    initializeUpbit();
    initializeBinance();
    initializeMempool();
    initializeFearGreedIndex().then();
  }, []);

  // endregion

}
