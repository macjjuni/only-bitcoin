"use client";

import { addAfterEffect, useFrame, useThree } from "@react-three/fiber";
import { type ReactNode, useCallback, useEffect, useRef } from "react";
import {
  createSpacePerformanceSample,
  recordSpacePerformanceFrame,
  type SpacePerformanceSummary,
  summarizeSpacePerformance,
} from "../lib/performanceSample";

/** 요약을 다시 내보내는 간격(ms). */
const PUBLISH_INTERVAL_MS = 1_000;

interface SpacePerformanceStatsProps {
  /** 요약이 바뀔 때마다 부름. 패널은 캔버스 밖 HUD(`SpacePerformancePanel`)가 그림. */
  onPublish: (summary: SpacePerformanceSummary) => void;
}

/**
 * 렌더 통계 측정기. 조작 안내 창에서 "성능 표시" 를 켰을 때만 붙임. 측정은 준비 5초 + 표본 10초이며 탭 복귀 시 재시작한다.
 *
 * 캔버스 안에서는 측정만 하고 아무것도 안 그림. 전에는 `<Html>` 로 패널까지 여기서 그렸는데,
 * 그건 3D 공간의 한 점에 매달린 DOM 이라 시야를 돌리면 사라지고 HUD 의 채팅창과 자리를
 * 맞출 수도 없었음.
 */
// biome-ignore format: AGENTS.md requires two blank lines between regions.
export default function SpacePerformanceStats({ onPublish }: SpacePerformanceStatsProps): ReactNode {
  // region [Hooks]
  const renderer = useThree((rootState) => rootState.gl);
  const sampleRef = useRef(createSpacePerformanceSample());
  const previousTimestampRef = useRef<number | null>(null);
  const publishedTimestampRef = useRef<number>(0);
  const hasRenderedFrameRef = useRef<boolean>(false);
  // endregion


  // region [Privates]
  const resetSample = useCallback((): void => {
    sampleRef.current = createSpacePerformanceSample();
    previousTimestampRef.current = null;
    publishedTimestampRef.current = 0;
    hasRenderedFrameRef.current = false;
    onPublish(summarizeSpacePerformance(sampleRef.current));
  }, [onPublish]);

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

      if (timestamp - publishedTimestampRef.current >= PUBLISH_INTERVAL_MS) {
        publishedTimestampRef.current = timestamp;
        onPublish(summarizeSpacePerformance(sampleRef.current));
      }
    });
    document.addEventListener("visibilitychange", resetSample);

    return () => {
      removeAfterEffect();
      document.removeEventListener("visibilitychange", resetSample);
    };
  }, [renderer, resetSample, onPublish]);
  // endregion


  // region [Life Cycles]
  useFrame(markRenderedFrame);

  useEffect(() => {
    return subscribePerformanceSampling();
  }, [subscribePerformanceSampling]);
  // endregion

  return null;
}
