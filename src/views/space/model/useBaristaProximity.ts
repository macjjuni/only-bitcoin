"use client";

import { useEffect, useRef, useState } from "react";
import type { SpaceSession } from "@/features/space-session";
import { resolveBaristaProximity } from "@/views/space/lib/barista";

/** 내 위치를 다시 읽는 간격(ms). 걸어서 다가가는 거라 이보다 촘촘할 필요가 없음. */
const PROXIMITY_INTERVAL_MS = 200;

/**
 * 바리스타에게 말을 걸 수 있는 자리에 있는지.
 *
 * 내 위치는 매 프레임 바뀌어 세션 상태에 없음. `useSpaceBgmZone` 처럼 1초에 다섯 번만
 * 읽고 드나들 때만 상태를 바꿈.
 */
// biome-ignore format: AGENTS.md requires two blank lines between regions.
export const useBaristaProximity = (session: SpaceSession): boolean => {
  // region [Hooks]
  const [isNear, setIsNear] = useState<boolean>(false);
  /** 타이머가 늘 최신 세션을 읽게 함. 세션이 바뀔 때마다 타이머를 다시 걸지 않음. */
  const sessionRef = useRef(session);
  const isNearRef = useRef<boolean>(false);

  sessionRef.current = session;
  // endregion


  // region [Privates]
  const refreshProximity = (): void => {
    isNearRef.current = resolveBaristaProximity(
      isNearRef.current,
      sessionRef.current.getSelfPosition(),
    );
    setIsNear(isNearRef.current);
  };

  const startPolling = (): (() => void) => {
    refreshProximity();
    const intervalID = window.setInterval(refreshProximity, PROXIMITY_INTERVAL_MS);

    return () => {
      window.clearInterval(intervalID);
    };
  };
  // endregion


  // region [Life Cycles]
  useEffect(startPolling, []);
  // endregion

  return isNear;
};
