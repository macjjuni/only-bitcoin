"use client";

import { useEffect, useRef, useState } from "react";
import { SPACE_BOSS_PLAYER } from "@/entities/space";
import type { SpaceSession } from "@/features/space-session";
import {
  type BossHudView,
  EMPTY_BOSS_HUD_VIEW,
  isSameBossHudView,
  resolveBossHudView,
  stepDisplayedHealth,
} from "@/views/space/lib/bossHud";

/** 화면 값을 다시 뽑는 간격(ms). 체력바는 CSS 전환이 사이를 메워 줌. */
const BOSS_HUD_INTERVAL_MS = 200;

/**
 * 전투 UI 에 띄울 값.
 *
 * 내 위치는 매 프레임 바뀌어 세션 상태에 없음. 1초에 다섯 번만 읽어
 * 화면에 쓸 값이 실제로 달라졌을 때만 상태를 바꿈.
 */
// biome-ignore format: AGENTS.md requires two blank lines between regions.
export const useBossHud = (session: SpaceSession): BossHudView => {
  // region [Hooks]
  const [view, setView] = useState<BossHudView>(EMPTY_BOSS_HUD_VIEW);
  /** 타이머가 늘 최신 세션을 읽게 함. 세션이 바뀔 때마다 타이머를 다시 걸지 않음. */
  const sessionRef = useRef(session);
  const displayedHealthRef = useRef<number>(SPACE_BOSS_PLAYER.maximumHealth);
  /** 마지막으로 반영한 서버 체력의 지문. 새 값이 왔는지 가름. */
  const serverHealthKeyRef = useRef<string>("");
  const lastTickAtRef = useRef<number>(0);

  sessionRef.current = session;
  // endregion


  // region [Privates]
  const refreshView = (): void => {
    const current = sessionRef.current;
    const nowMs = performance.now();
    const deltaSeconds = lastTickAtRef.current === 0 ? 0 : (nowMs - lastTickAtRef.current) / 1000;
    const selfPosition = current.getSelfPosition();
    // 같은 체력으로 두 번 맞을 일은 없지만 쓰러졌다 일어나면 가득으로 같은 값이 다시 옴.
    const serverHealthKey = `${current.selfHealth}:${current.selfDamagedAt}:${current.deadUntil}`;

    lastTickAtRef.current = nowMs;
    displayedHealthRef.current = stepDisplayedHealth(
      displayedHealthRef.current,
      current.selfHealth,
      serverHealthKey !== serverHealthKeyRef.current,
      selfPosition,
      deltaSeconds,
    );
    serverHealthKeyRef.current = serverHealthKey;

    const nextView = resolveBossHudView({
      nowMs,
      clockOffsetMs: current.serverClockOffsetMs,
      canFightBoss: current.canFightBoss,
      bossPhase: current.bossState.phase,
      selfPosition,
      selfHealth: displayedHealthRef.current,
      deadUntil: current.deadUntil,
    });

    setView((previousView) => (isSameBossHudView(previousView, nextView) ? previousView : nextView));
  };

  const startPolling = (): (() => void) => {
    refreshView();
    const intervalID = window.setInterval(refreshView, BOSS_HUD_INTERVAL_MS);

    return () => {
      window.clearInterval(intervalID);
    };
  };
  // endregion


  // region [Life Cycles]
  useEffect(startPolling, []);
  // endregion

  return view;
};
