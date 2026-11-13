"use client";

import { useEffect, useRef, useState } from "react";
import type { SpaceBgmZoneTrack } from "@/features/space-bgm";
import type { SpaceSession } from "@/features/space-session";
import { resolveRaidZonePresence, resolveZoneBgmTrack } from "@/views/space/lib/bossHud";

/** 내 위치를 다시 읽는 간격(ms). 곡은 1.5초에 걸쳐 바뀌어서 이보다 촘촘할 필요가 없음. */
const BGM_ZONE_INTERVAL_MS = 200;

/**
 * `?bgmzone=courtyard` · `?bgmzone=raid` 로 곡을 고정함. 확인용임.
 *
 * 개발 서버는 보스가 금방 다시 떠서(`SPACE_BOSS_RESPAWN_SECONDS`) 대기 곡을 들을 틈이 없음.
 * 내 소리만 바뀌어서 운영에서도 막지 않음.
 */
const readForcedZoneTrack = (): SpaceBgmZoneTrack | null => {
  const rawValue = new URLSearchParams(window.location.search).get("bgmzone");

  return rawValue === "courtyard" || rawValue === "raid" ? rawValue : null;
};

/**
 * 안뜰에서 틀 곡. 홀 안이면 `null`.
 *
 * 내 위치와 보스 상태는 매 프레임 바뀌어 세션 상태에 없음. `useBossHud` 처럼 1초에
 * 다섯 번만 읽고 곡이 달라졌을 때만 상태를 바꿈.
 */
// biome-ignore format: AGENTS.md requires two blank lines between regions.
export const useSpaceBgmZone = (session: SpaceSession): SpaceBgmZoneTrack | null => {
  // region [Hooks]
  const [zoneTrack, setZoneTrack] = useState<SpaceBgmZoneTrack | null>(null);
  const [forcedZoneTrack] = useState<SpaceBgmZoneTrack | null>(readForcedZoneTrack);
  /** 타이머가 늘 최신 세션을 읽게 함. 세션이 바뀔 때마다 타이머를 다시 걸지 않음. */
  const sessionRef = useRef(session);
  const isInRaidZoneRef = useRef<boolean>(false);

  sessionRef.current = session;
  // endregion


  // region [Privates]
  const refreshZoneTrack = (): void => {
    const current = sessionRef.current;

    isInRaidZoneRef.current = resolveRaidZonePresence(
      isInRaidZoneRef.current,
      current.canFightBoss,
      current.getSelfPosition(),
    );
    setZoneTrack(resolveZoneBgmTrack(isInRaidZoneRef.current, current.bossState.phase));
  };

  const startPolling = (): (() => void) => {
    refreshZoneTrack();
    const intervalID = window.setInterval(refreshZoneTrack, BGM_ZONE_INTERVAL_MS);

    return () => {
      window.clearInterval(intervalID);
    };
  };
  // endregion


  // region [Life Cycles]
  useEffect(startPolling, []);
  // endregion

  return forcedZoneTrack ?? zoneTrack;
};
