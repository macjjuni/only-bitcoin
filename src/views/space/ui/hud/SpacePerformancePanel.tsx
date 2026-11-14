"use client";

import { memo, type ReactNode, useEffect, useState } from "react";
import type { SpacePerformanceSummary } from "@/views/space/lib/performanceSample";

/** 서버 왕복 시간을 다시 재는 간격(ms). */
const NETWORK_PROBE_INTERVAL_MS = 2_000;

interface NetworkStats {
  lastRttMs: number | null;
  bestRttMs: number | null;
}

interface SpacePerformancePanelProps {
  /** 캔버스 안 측정기(`SpacePerformanceStats`)가 내보낸 요약. */
  summary: SpacePerformanceSummary;
  dummyCount: number;
  /** 서버까지의 왕복 시간. 프레임은 멀쩡한데 남의 움직임이 늦을 때 망 탓인지 가림. */
  getNetworkStats: () => NetworkStats;
  /** 왕복 시간을 한 번 더 잼. 패널이 떠 있는 동안만 자주 부름. */
  probeNetwork: () => void;
}

/**
 * 계측 패널. 조작 안내 창의 "성능 표시" 스위치로 켬.
 *
 * HUD 좌측 상단 묶음 안에 놓여 그 위 요소 바로 아래에 붙음 — 손가락 기기는 채팅 내역,
 * 데스크톱은 접속 표시 아래임. 채팅 내역을 접으면 같이 따라 올라감.
 */
// biome-ignore format: AGENTS.md requires two blank lines between regions.
function SpacePerformancePanel({ summary, dummyCount, getNetworkStats, probeNetwork }: SpacePerformancePanelProps): ReactNode {
  // region [Hooks]
  const [networkStats, setNetworkStats] = useState<NetworkStats>(getNetworkStats);
  // endregion


  // region [Life Cycles]
  useEffect(() => {
    const intervalID = window.setInterval(() => {
      setNetworkStats(getNetworkStats());
      probeNetwork();
    }, NETWORK_PROBE_INTERVAL_MS);

    return () => {
      window.clearInterval(intervalID);
    };
  }, [getNetworkStats, probeNetwork]);
  // endregion


  // region [Templates]
  const phaseLabel = summary.isWarmingUp ? "준비 5초" : "측정 중";
  const statusLabel = summary.isComplete ? "측정 완료" : phaseLabel;
  const progressLabel = `${summary.elapsedSeconds.toFixed(1)} / 10초 · ${summary.frameCount} frames`;
  const liveLabel = `지금 ${summary.liveFramesPerSecond.toFixed(1)} FPS`;
  const fpsLabel = `${summary.framesPerSecond.toFixed(1)} FPS · p95 ${summary.p95FrameMilliseconds.toFixed(1)} ms`;
  const dprLabel = `DPR ${summary.minDpr.toFixed(2)} ~ ${summary.maxDpr.toFixed(2)}`;
  const networkLabel =
    networkStats.lastRttMs === null
      ? "서버 왕복 측정 전"
      : `서버 왕복 ${networkStats.lastRttMs.toFixed(0)} ms · 최소 ${(networkStats.bestRttMs ?? networkStats.lastRttMs).toFixed(0)} ms`;
  // endregion

  return (
    <output
      data-space-performance={JSON.stringify(summary)}
      className="pointer-events-none mt-2 block w-max max-w-[calc(100vw-5.5rem)] rounded-lg bg-black/80 px-3 py-2 font-mono text-[11px] leading-5 text-white"
    >
      <span className="block">Space dev · 원격 더미 {dummyCount}명 + 로컬 1명</span>
      <span className="block">
        {statusLabel} · {progressLabel}
      </span>
      {/* 실시간 값이 먼저다. 10초 표본은 끝나면 멈추지만 이 줄은 계속 돈다. */}
      <span className="block font-bold text-white">{liveLabel}</span>
      <span className="block">{fpsLabel}</span>
      <span className="block">{dprLabel}</span>
      <span className="block font-bold text-white">{networkLabel}</span>
      <span className="block text-white/60">10초 표본은 새로고침으로 재측정</span>
    </output>
  );
}

const MemoizedSpacePerformancePanel = memo(SpacePerformancePanel);
MemoizedSpacePerformancePanel.displayName = "SpacePerformancePanel";

export default MemoizedSpacePerformancePanel;
