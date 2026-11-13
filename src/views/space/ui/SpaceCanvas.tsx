"use client";

import { PerformanceMonitor, type PerformanceMonitorApi } from "@react-three/drei";
import { Canvas } from "@react-three/fiber";
import {
  memo,
  type ReactNode,
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { NeutralToneMapping } from "three";
import { SPACE_BOSS_PLAYER, SPACE_MARKET, type SpaceCelebration } from "@/entities/space";
import type { ChatIdentity } from "@/features/chat-session";
import { useSpaceBgm } from "@/features/space-bgm";
import {
  createSpaceInputSource,
  loadAvatarModelIndex,
  SPACE_CAMERA,
  saveAvatarModelIndex,
  useKeyboardInput,
} from "@/features/space-controls";
import { useSpaceSession } from "@/features/space-session";
import { isAndroidDevice, isIOSDevice } from "@/shared/utils/device";
import {
  type DprPolicy,
  resolveDprFromPerformanceFactor,
  resolveDprPolicy,
  SPACE_DPR_POLICY,
} from "@/views/space/lib/renderQuality";
import {
  resolveServerLoadStage,
  SPACE_LOADING,
  type SpaceLoadStages,
} from "@/views/space/lib/spaceLoading";
import { useScreenCelebrationSound } from "../model/useScreenCelebrationSound";
import { useSpaceBgmZone } from "../model/useSpaceBgmZone";
import { useSpaceSfx } from "../model/useSpaceSfx";
import SpaceHud from "./hud/SpaceHud";
import SpaceFallback, { type SpaceFallbackReason } from "./SpaceFallback";
import SpaceLoadingOverlay from "./SpaceLoadingOverlay";
import SpacePerformanceStats from "./SpacePerformanceStats";
import SpaceScene from "./scene/SpaceScene";

/** 컨텍스트 복구를 기다리는 시간. 넘기면 폴백으로 전환한다. */
const CONTEXT_RESTORE_TIMEOUT_MS = 3_000;
/** 처치 팡파르를 늦추는 시간(초). 보스가 쓰러지는 소리와 안 겹치게 함. */
const VICTORY_SOUND_DELAY_SECONDS = 1.5;
/**
 * 톤 매핑.
 *
 * 홀은 라이트맵에 색이 구워져 있어서 ACES 를 걸면 램프 톤이 누렇게 뜸. 맵
 * README 권장대로 Neutral 을 쓰고 노출은 1.0 으로 둠. 섬 시절 0.9 는 밝은 노을
 * 하늘 때문에 내린 값이었음.
 */
const SPACE_TONE_MAPPING = NeutralToneMapping;
const SPACE_TONE_MAPPING_EXPOSURE = 1;

const CAMERA_NEAR = 0.1;
/**
 * 원평면. 안뜰 하늘 돔(중심 x 28, 반지름 약 87 m)이 홀 반대쪽 끝에서도 안 잘리게 잡았음.
 * 가장 먼 카메라 자리에서 돔 끝까지 약 150 m 임.
 */
const CAMERA_FAR = 160;

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
  const [localCelebration, setLocalCelebration] = useState<SpaceCelebration | null>(null);
  const [fallbackReason, setFallbackReason] = useState<SpaceFallbackReason | null>(null);
  const [isSupportProbed, setIsSupportProbed] = useState<boolean>(false);
  const [hasRealtimeShadows, setHasRealtimeShadows] = useState<boolean>(false);
  const [frameloop, setFrameloop] = useState<"always" | "never">("always");
  const [renderDpr, setRenderDpr] = useState<number>(SPACE_DPR_POLICY.desktop.initial);
  /** 기기별 해상도 범위. 성능 콜백에서 읽어서 ref 로 둠. */
  const dprPolicyRef = useRef<DprPolicy>(SPACE_DPR_POLICY.desktop);
  /**
   * 계측 패널 표시 여부.
   *
   * **운영에서도 `?stats=1` 로 켠다.** 개발 환경에만 두면 실기기 측정이
   * `pnpm dev` 를 띄운 PC 와 같은 네트워크에 폰을 붙이는 일이 되고, dpr·번들·
   * 소스맵이 모두 달라 운영 성능을 대신하지 못한다. §8.2 가 계속 "미측정" 인
   * 이유도 그것이다.
   *
   * 쿼리로만 켜지므로 일반 접속자에게는 보이지 않고, 패널에는 렌더 통계 외에
   * 아무 정보도 없다. 더미(`?dummies=N`)는 운영에서 계속 막는다 — 가짜 아바타
   * 50명은 실제 접속자에게 보이고 좌석을 혼동시킨다.
   */
  const [hasPerformanceStats] = useState(
    () => new URLSearchParams(window.location.search).get("stats") === "1",
  );
  /** `?celebrate=1` 로만 폭죽 테스트 버튼을 켠다. 누르면 방 전체에 터져서 일반 접속자에게는 숨긴다. */
  const [hasCelebrationTest] = useState(
    () => new URLSearchParams(window.location.search).get("celebrate") === "1",
  );

  /**
   * 고른 아바타 모델.
   *
   * 저장소에서 한 번 읽어 입장 프레임에 실어 보내고, 서버가 확정한 값이 오면
   * 그쪽을 쓴다. 바꿀 때는 저장소와 이 상태를 함께 갱신한다.
   */
  const [localModelIndex, setLocalModelIndex] = useState<number>(loadAvatarModelIndex);
  const session = useSpaceSession({
    identity,
    modelIndex: localModelIndex,
    enabled: isSupportProbed && !fallbackReason && dummyCount === 0,
  });
  const bgm = useSpaceBgm({
    market: session.market,
    serverClockOffsetMs: session.serverClockOffsetMs,
    zoneTrack: useSpaceBgmZone(session),
  });
  const celebration = dummyCount > 0 ? localCelebration : session.celebration;
  const celebrationClockOffsetMs = dummyCount > 0 ? 0 : session.serverClockOffsetMs;
  const isTestRequester =
    celebration?.testSeat !== undefined && celebration.testSeat === session.self?.seat;
  useScreenCelebrationSound(
    celebration,
    celebrationClockOffsetMs,
    bgm.isPlaying || isTestRequester || dummyCount > 0,
  );
  /** 효과음도 배경음악 설정을 따름. 음악을 끈 사람은 조용히 있고 싶은 사람임. */
  const playSfx = useSpaceSfx(bgm.isPlaying);
  const bossKilledAt = session.bossDefeat?.killedAt;
  /** 입장 로딩 신호. 한 번 켜지면 끄지 않음 — 모델을 바꿔도 오버레이를 다시 띄우지 않음. */
  const [isMapReady, setIsMapReady] = useState<boolean>(false);
  const [isAvatarReady, setIsAvatarReady] = useState<boolean>(false);
  const [isServerTimedOut, setIsServerTimedOut] = useState<boolean>(false);
  const [isLoadingHardTimedOut, setIsLoadingHardTimedOut] = useState<boolean>(false);
  const nickname = session.self?.nickname ?? identity.nickname;
  const modelIndex = session.self?.modelIndex ?? localModelIndex;

  useKeyboardInput(inputSource);
  // endregion

  // region [Events]
  const onCelebrate = useCallback((): void => {
    if (dummyCount > 0) {
      setLocalCelebration({
        id: crypto.randomUUID(),
        startsAt: performance.now() + SPACE_MARKET.eventLeadMs,
        seed: Math.floor(Math.random() * 0xffffffff),
      });
      return;
    }
    session.requestCelebration();
  }, [dummyCount, session.requestCelebration]);

  /** 선택을 저장하고 서버에 알린다. 서버가 받아들이면 `peer` 로 모두에게 퍼진다. */
  const onChangeModel = useCallback(
    async (nextModelIndex: number): Promise<boolean> => {
      setLocalModelIndex(nextModelIndex);
      saveAvatarModelIndex(nextModelIndex);

      return session.changeModel(nextModelIndex);
    },
    [session.changeModel],
  );
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

  /** 서버 대기와 전체 상한 타이머를 걺. 지원 확인이 끝난 뒤부터 잼. */
  const startLoadingTimers = (): (() => void) => {
    const serverTimeoutId = window.setTimeout(() => {
      setIsServerTimedOut(true);
    }, SPACE_LOADING.serverTimeoutInMilliseconds);
    const hardTimeoutId = window.setTimeout(() => {
      setIsLoadingHardTimedOut(true);
    }, SPACE_LOADING.hardTimeoutInMilliseconds);

    return () => {
      window.clearTimeout(serverTimeoutId);
      window.clearTimeout(hardTimeoutId);
    };
  };
  // endregion

  // region [Events]
  /**
   * 프레임 측정값에 따라 렌더 해상도를 올리고 내린다.
   *
   * 기기 dpr 이 3 인 폰에서 1.5 로 그리면 같은 화면의 DOM HUD 보다 눈에 띄게
   * 흐림. 여유가 있으면 기기별 상한(모바일 2.5)까지 올리고, 모자라면 다시 내림.
   */
  const onChangePerformance = useCallback(({ factor }: PerformanceMonitorApi): void => {
    setRenderDpr(resolveDprFromPerformanceFactor(factor, dprPolicyRef.current));
  }, []);

  const onFallbackPerformance = useCallback((): void => {
    setRenderDpr(dprPolicyRef.current.min);
  }, []);

  const onReadyMap = useCallback((): void => {
    setIsMapReady(true);
  }, []);

  const onReadyAvatar = useCallback((): void => {
    setIsAvatarReady(true);
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
    const selfPosition = session.getSelfPosition();

    // 보스 소리는 전부 안뜰에서만 냄. 홀 안까지 울리면 뜬금없음.
    if (
      bossKilledAt !== undefined &&
      selfPosition &&
      selfPosition.x > SPACE_BOSS_PLAYER.hallMaximumX
    ) {
      playSfx("victory", VICTORY_SOUND_DELAY_SECONDS);
    }
  }, [bossKilledAt, playSfx, session.getSelfPosition]);

  useEffect(() => {
    if (!isSupportProbed) {
      return;
    }

    return startLoadingTimers();
  }, [isSupportProbed]);

  useEffect(() => {
    const dprPolicy = resolveDprPolicy(isIOSDevice() || isAndroidDevice(), window.devicePixelRatio);

    dprPolicyRef.current = dprPolicy;
    setRenderDpr(dprPolicy.initial);
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
  const loadStages = useMemo<SpaceLoadStages>(
    () => ({
      map: isMapReady ? "done" : "pending",
      avatar: isAvatarReady ? "done" : "pending",
      server: resolveServerLoadStage({
        presenceStatus: session.presence.status,
        hasSessionError: session.error !== null,
        isConnectionConfigured: session.isConnectionConfigured,
        isDummyMode: dummyCount > 0,
        isServerTimedOut,
      }),
    }),
    [
      isMapReady,
      isAvatarReady,
      session.presence.status,
      session.error,
      session.isConnectionConfigured,
      dummyCount,
      isServerTimedOut,
    ],
  );

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
        gl={{
          antialias: true,
          powerPreference: "high-performance",
          toneMapping: SPACE_TONE_MAPPING,
          toneMappingExposure: SPACE_TONE_MAPPING_EXPOSURE,
        }}
        onCreated={onCreatedCanvas}
      >
        <PerformanceMonitor
          onChange={onChangePerformance}
          onFallback={onFallbackPerformance}
          flipflops={3}
        />

        {/*
          씬 서스펜드를 캔버스 안에서 막음. 경계가 없으면 R3F 가 바깥 트리로 넘겨
          `next/dynamic` 폴백이 화면을 덮고, 돌아올 때 로딩 오버레이가 새로 마운트돼
          두 번 뜸. 주소로 바로 들어와 모델이 아직 캐시에 없을 때 생겼음.
        */}
        <Suspense fallback={null}>
          <SpaceScene
            inputSource={inputSource}
            celebration={celebration}
            celebrationClockOffsetMs={celebrationClockOffsetMs}
            clientKey={identity.clientKey}
            modelIndex={modelIndex}
            nickname={nickname}
            session={session}
            hasRealtimeShadows={hasRealtimeShadows}
            dummyCount={dummyCount}
            onReadyMap={onReadyMap}
            onReadyAvatar={onReadyAvatar}
            playSfx={playSfx}
          />
        </Suspense>
        {hasPerformanceStats && <SpacePerformanceStats dummyCount={dummyCount} />}
      </Canvas>

      <SpaceHud
        bgm={bgm}
        canTestCelebration={
          hasCelebrationTest &&
          (dummyCount > 0 || (session.canSyncMarket && session.presence.status === "online"))
        }
        onCelebrate={onCelebrate}
        inputSource={inputSource}
        session={session}
        nickname={nickname}
        modelIndex={modelIndex}
        onChangeModel={onChangeModel}
      />

      <SpaceLoadingOverlay stages={loadStages} isHardTimedOut={isLoadingHardTimedOut} />
    </div>
  );
}

const MemoizedSpaceCanvas = memo(SpaceCanvas);
MemoizedSpaceCanvas.displayName = "SpaceCanvas";

export default MemoizedSpaceCanvas;
