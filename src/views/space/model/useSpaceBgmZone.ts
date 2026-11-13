"use client";

import { useEffect, useRef, useState } from "react";
import type { SpaceSession } from "@/features/space-session";
import { resolveRaidZonePresence } from "@/views/space/lib/bossHud";

/** 내 위치를 다시 읽는 간격(ms). 곡은 1.5초에 걸쳐 바뀌어서 이보다 촘촘할 필요가 없음. */
const RAID_ZONE_INTERVAL_MS = 200;

/**
 * 레이드 구역(안뜰)에 나와 있는지.
 *
 * 내 위치는 매 프레임 바뀌어 세션 상태에 없음. `useBossHud` 처럼 1초에 다섯 번만 읽고
 * 드나들었을 때만 상태를 바꿈.
 */
// biome-ignore format: AGENTS.md requires two blank lines between regions.
export const useRaidZonePresence = (session: SpaceSession): boolean => {
  // region [Hooks]
  const [isInRaidZone, setIsInRaidZone] = useState<boolean>(false);
  /** 타이머가 늘 최신 세션을 읽게 함. 세션이 바뀔 때마다 타이머를 다시 걸지 않음. */
  const sessionRef = useRef(session);

  sessionRef.current = session;
  // endregion


  // region [Privates]
  const refreshPresence = (): void => {
    const current = sessionRef.current;

    setIsInRaidZone((wasInside) =>
      resolveRaidZonePresence(wasInside, current.canFightBoss, current.getSelfPosition()),
    );
  };

  const startPolling = (): (() => void) => {
    refreshPresence();
    const intervalID = window.setInterval(refreshPresence, RAID_ZONE_INTERVAL_MS);

    return () => {
      window.clearInterval(intervalID);
    };
  };
  // endregion


  // region [Life Cycles]
  useEffect(startPolling, []);
  // endregion

  return isInRaidZone;
};
