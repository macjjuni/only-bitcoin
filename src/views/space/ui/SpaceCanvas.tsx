"use client";

import { PerformanceMonitor, type PerformanceMonitorApi } from "@react-three/drei";
import { Canvas } from "@react-three/fiber";
import { memo, type ReactNode, useCallback, useEffect, useMemo, useState } from "react";
import type { ChatIdentity } from "@/features/chat-session";
import { createSpaceInputSource, SPACE_CAMERA, useKeyboardInput } from "@/features/space-controls";
import { useSpaceSession } from "@/features/space-session";
import { isAndroidDevice, isIOSDevice } from "@/shared/utils/device";
import {
  resolveDprFromPerformanceFactor,
  SPACE_INITIAL_DPR,
  SPACE_MIN_DPR,
} from "@/views/space/lib/renderQuality";
import SpaceHud from "./hud/SpaceHud";
import SpaceFallback, { type SpaceFallbackReason } from "./SpaceFallback";
import SpacePerformanceStats from "./SpacePerformanceStats";
import SpaceScene from "./scene/SpaceScene";

/** 컨텍스트 복구를 기다리는 시간. 넘기면 폴백으로 전환한다. */
const CONTEXT_RESTORE_TIMEOUT_MS = 3_000;
const CAMERA_NEAR = 0.1;
const CAMERA_FAR = 220;

interface SpaceCanvasProps {
  identity: ChatIdentity;
  /** 개발 전용 더미 아바타 수. */
  dummyCount: number;
}

// region [Privates]
const hasWebGL2Support = (): boolean => {
  try {
    const probeCanvas = document.createElement("canvas");
    return Boolean(window.WebGL2RenderingContext && probeCanvas.getContext("webgl2"));
  } catch {
    return false;
  }
};

/** 모바일에서는 실시간 그림자 맵을 끈다. 아바타는 블롭 그림자로 대체한다. */
const hasRealtimeShadowBudget = (): boolean => {
  return !isIOSDevice() && !isAndroidDevice();
};
// endregion

function SpaceCanvas({ identity, dummyCount }: SpaceCanvasProps): ReactNode {
  // region [Hooks]
  const inputSource = useMemo(() => createSpaceInputSource(), []);
  const [fallbackReason, setFallbackReason] = useState<SpaceFallbackReason | null>(null);
  const [isSupportProbed, setIsSupportProbed] = useState<boolean>(false);
  const [hasRealtimeShadows, setHasRealtimeShadows] = useState<boolean>(false);
  const [frameloop, setFrameloop] = useState<"always" | "never">("always");
  const [renderDpr, setRenderDpr] = useState<number>(SPACE_INITIAL_DPR);
  const [hasPerformanceStats] = useState(
    () =>
      process.env.NODE_ENV !== "production" &&
      new URLSearchParams(window.location.search).get("stats") === "1",
  );

  const session = useSpaceSession({
    identity,
    enabled: isSupportProbed && !fallbackReason && dummyCount === 0,
  });
  const nickname = session.self?.nickname ?? identity.nickname;

  useKeyboardInput(inputSource);
  // endregion

  // region [Privates]
  const attachContextRecovery = useCallback((canvasElement: HTMLCanvasElement): (() => void) => {
    let restoreTimeoutId: number | undefined;

    const onContextLost = (contextEvent: Event): void => {
      // preventDefault 를 해야 브라우저가 컨텍스트 복구를 시도한다.
      contextEvent.preventDefault();
      restoreTimeoutId = window.setTimeout(() => {
        setFallbackReason("contextLost");
      }, CONTEXT_RESTORE_TIMEOUT_MS);
    };

    const onContextRestored = (): void => {
      window.clearTimeout(restoreTimeoutId);
      setFallbackReason(null);
    };

    canvasElement.addEventListener("webglcontextlost", onContextLost);
    canvasElement.addEventListener("webglcontextrestored", onContextRestored);

    return () => {
      window.clearTimeout(restoreTimeoutId);
      canvasElement.removeEventListener("webglcontextlost", onContextLost);
      canvasElement.removeEventListener("webglcontextrestored", onContextRestored);
    };
  }, []);
  // endregion

  // region [Events]
  /**
   * 프레임 측정값에 따라 렌더 해상도를 올리고 내린다.
   *
   * 기기 dpr 이 3 인 폰에서 1.5 로 그리면 같은 화면의 DOM HUD 보다 눈에 띄게
   * 흐리다. 여유가 있으면 2 까지 올리고, 모자라면 다시 내린다.
   */
  const onChangePerformance = useCallback(({ factor }: PerformanceMonitorApi): void => {
    setRenderDpr(resolveDprFromPerformanceFactor(factor));
  }, []);

  const onFallbackPerformance = useCallback((): void => {
    setRenderDpr(SPACE_MIN_DPR);
  }, []);

  const onClickRetryFallback = useCallback((): void => {
    window.location.reload();
  }, []);

  const onCreatedCanvas = useCallback(
    (rootState: { gl: { domElement: HTMLCanvasElement } }): void => {
      attachContextRecovery(rootState.gl.domElement);
    },
    [attachContextRecovery],
  );
  // endregion

  // region [Life Cycles]
  useEffect(() => {
    setHasRealtimeShadows(hasRealtimeShadowBudget());
    setFallbackReason(hasWebGL2Support() ? null : "unsupported");
    setIsSupportProbed(true);
  }, []);

  useEffect(() => {
    const applyVisibilityState = (): void => {
      // 탭이 가려진 동안 렌더 루프를 멈춘다. 배터리와 GPU 를 쓸 이유가 없다.
      setFrameloop(document.hidden ? "never" : "always");
    };

    applyVisibilityState();
    document.addEventListener("visibilitychange", applyVisibilityState);

    return () => {
      document.removeEventListener("visibilitychange", applyVisibilityState);
    };
  }, []);
  // endregion

  // region [Templates]
  if (!isSupportProbed) {
    return <div className="h-full w-full bg-[#06080e]" />;
  }

  if (fallbackReason) {
    return <SpaceFallback reason={fallbackReason} onClickRetry={onClickRetryFallback} />;
  }
  // endregion

  return (
    <div className="relative h-full w-full overflow-hidden bg-[#06080e]">
      <Canvas
        dpr={renderDpr}
        frameloop={frameloop}
        shadows={hasRealtimeShadows}
        camera={{ fov: SPACE_CAMERA.fov, near: CAMERA_NEAR, far: CAMERA_FAR }}
        gl={{ antialias: true, powerPreference: "high-performance" }}
        onCreated={onCreatedCanvas}
      >
        <PerformanceMonitor
          onChange={onChangePerformance}
          onFallback={onFallbackPerformance}
          flipflops={3}
        />

        <SpaceScene
          inputSource={inputSource}
          clientKey={identity.clientKey}
          nickname={nickname}
          session={session}
          hasRealtimeShadows={hasRealtimeShadows}
          dummyCount={dummyCount}
        />
        {hasPerformanceStats && <SpacePerformanceStats dummyCount={dummyCount} />}
      </Canvas>

      <SpaceHud inputSource={inputSource} session={session} nickname={nickname} />
    </div>
  );
}

const MemoizedSpaceCanvas = memo(SpaceCanvas);
MemoizedSpaceCanvas.displayName = "SpaceCanvas";

export default MemoizedSpaceCanvas;
