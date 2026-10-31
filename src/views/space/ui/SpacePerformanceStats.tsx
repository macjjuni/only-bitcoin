"use client";

import { Html } from "@react-three/drei";
import { addAfterEffect, useFrame, useThree } from "@react-three/fiber";
import { type ReactNode, useCallback, useEffect, useRef, useState } from "react";
import {
  createSpacePerformanceSample,
  recordSpacePerformanceFrame,
  summarizeSpacePerformance,
} from "../lib/performanceSample";

interface SpacePerformanceStatsProps {
  dummyCount: number;
}

/** 개발용 stats 쿼리에서만 표시한다. 측정은 준비 5초 + 표본 10초이며 탭 복귀 시 재시작한다. */
// biome-ignore format: AGENTS.md requires two blank lines between regions.
export default function SpacePerformanceStats({
  dummyCount,
}: SpacePerformanceStatsProps): ReactNode {
  // region [Hooks]
  const renderer = useThree((rootState) => rootState.gl);
  const sampleRef = useRef(createSpacePerformanceSample());
  const previousTimestampRef = useRef<number | null>(null);
  const publishedTimestampRef = useRef<number>(0);
  const hasRenderedFrameRef = useRef<boolean>(false);
  const [summary, setSummary] = useState(() => summarizeSpacePerformance(sampleRef.current));
  // endregion


  // region [Privates]
  const resetSample = useCallback((): void => {
    sampleRef.current = createSpacePerformanceSample();
    previousTimestampRef.current = null;
    publishedTimestampRef.current = 0;
    hasRenderedFrameRef.current = false;
    setSummary(summarizeSpacePerformance(sampleRef.current));
  }, []);

  const markRenderedFrame = (): void => {
    hasRenderedFrameRef.current = true;
  };

  const subscribePerformanceSampling = useCallback(() => {
    // useFrame 은 render 이전이다. after effect 에서 읽어야 그림자 패스까지 포함한
    // 해당 프레임의 renderer.info 값을 얻는다(현재 씬은 프레임당 render 1회).
    const removeAfterEffect = addAfterEffect((timestamp) => {
      if (!hasRenderedFrameRef.current || document.hidden) {
        return;
      }
      hasRenderedFrameRef.current = false;

      const previousTimestamp = previousTimestampRef.current;
      previousTimestampRef.current = timestamp;
      if (previousTimestamp === null) {
        return;
      }

      recordSpacePerformanceFrame(sampleRef.current, {
        deltaMilliseconds: timestamp - previousTimestamp,
        drawCalls: renderer.info.render.calls,
        triangles: renderer.info.render.triangles,
        dpr: renderer.getPixelRatio(),
      });

      if (timestamp - publishedTimestampRef.current >= 1_000) {
        publishedTimestampRef.current = timestamp;
        setSummary(summarizeSpacePerformance(sampleRef.current));
      }
    });
    document.addEventListener("visibilitychange", resetSample);

    return () => {
      removeAfterEffect();
      document.removeEventListener("visibilitychange", resetSample);
    };
  }, [renderer, resetSample]);
  // endregion


  // region [Life Cycles]
  useFrame(markRenderedFrame);

  useEffect(() => {
    return subscribePerformanceSampling();
  }, [subscribePerformanceSampling]);
  // endregion


  // region [Templates]
  const phaseLabel = summary.isWarmingUp ? "준비 5초" : "측정 중";
  const statusLabel = summary.isComplete ? "측정 완료" : phaseLabel;
  const progressLabel = `${summary.elapsedSeconds.toFixed(1)} / 10초 · ${summary.frameCount} frames`;
  const fpsLabel = `${summary.framesPerSecond.toFixed(1)} FPS · p95 ${summary.p95FrameMilliseconds.toFixed(1)} ms`;
  const renderLabel = `최대 ${summary.maxDrawCalls} calls · ${summary.maxTriangles.toLocaleString()} triangles`;
  const dprLabel = `DPR ${summary.minDpr.toFixed(2)} ~ ${summary.maxDpr.toFixed(2)}`;
  const serializedSummary = JSON.stringify(summary);
  // endregion

  return (
    <Html fullscreen style={{ pointerEvents: "none" }}>
      <output
        data-space-performance={serializedSummary}
        className="pointer-events-none absolute left-4 top-16 max-w-[calc(100vw-5rem)] rounded-lg bg-black/80 px-3 py-2 font-mono text-[11px] leading-5 text-white"
      >
        <span className="block">Space dev · 원격 더미 {dummyCount}명 + 로컬 1명</span>
        <span className="block">
          {statusLabel} · {progressLabel}
        </span>
        <span className="block">{fpsLabel}</span>
        <span className="block">{renderLabel}</span>
        <span className="block">{dprLabel}</span>
        <span className="block text-white/60">새로고침으로 재측정 · 실기기에서 확인</span>
      </output>
    </Html>
  );
}
