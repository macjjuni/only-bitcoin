"use client";

import { useCallback, useEffect } from "react";
import { orderFlowController } from "../../api/orderFlowController";
import useOrderFlowStore from "../../model/orderFlowStore";

/**
 * 세 거래소 실시간 연결의 수명주기와 HUD 커밋 주기를 담당하는 훅.
 *
 * 체결 한 건마다 React state 를 건드리면 초당 수백 번 리렌더가 난다. 그래서 커넥터는
 * 자기 버퍼에만 쓰고, 이 훅이 `commitIntervalInMs` 간격으로 요약본 하나만 스토어에 올린다.
 * 캔버스는 스토어를 거치지 않고 컨트롤러를 직접 읽는다.
 *
 * @param commitIntervalInMs HUD 갱신 간격. 초당 4~10회 범위를 쓴다.
 * @returns 캔버스가 체결·오더북을 직접 읽을 때 쓰는 컨트롤러.
 */
export function useOrderFlow(commitIntervalInMs: number) {
  //#region [Privates]
  /** 현재 지표를 한 벌로 만들어 스토어에 올린다. */
  const commitSnapshot = useCallback((): void => {
    useOrderFlowStore.getState().setSnapshot(orderFlowController.buildSnapshot(Date.now()));
  }, []);
  //#endregion

  //#region [Life Cycles]
  useEffect(() => {
    orderFlowController.acquire();

    return () => {
      orderFlowController.release();
      useOrderFlowStore.getState().resetSnapshot();
    };
  }, []);

  useEffect(() => {
    const commitTimerID = setInterval(commitSnapshot, commitIntervalInMs);

    return () => {
      clearInterval(commitTimerID);
    };
  }, [commitIntervalInMs, commitSnapshot]);
  //#endregion

  return orderFlowController;
}
