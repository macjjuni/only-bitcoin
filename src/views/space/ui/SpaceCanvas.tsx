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
import {
  SpaceSessionContext,
  useSpaceSession,
  useSpaceSessionSelector,
} from "@/features/space-session";
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
import type { SpacePerformanceSummary } from "../lib/performanceSample";
import { useScreenCelebrationSound } from "../model/useScreenCelebrationSound";
import { useSpaceBgmZone } from "../model/useSpaceBgmZone";
import { useSpaceSfx } from "../model/useSpaceSfx";
import SpaceHud from "./hud/SpaceHud";
import SpaceFallback, { type SpaceFallbackReason } from "./SpaceFallback";
import SpaceLoadingOverlay from "./SpaceLoadingOverlay";
import SpacePerformanceStats from "./SpacePerformanceStats";
import SpaceScene from "./scene/SpaceScene";

/** 계측 패널을 켜 뒀는지는 이 브라우저에만 기억함. 새로고침해야 10초 표본을 다시 재서 남겨 둬야 함. */
const STATS_ENABLED_STORAGE_KEY = "only-btc.space.stats-enabled";

const readIsStatsEnabled = (): boolean => {
  try {
    return window.localStorage.getItem(STATS_ENABLED_STORAGE_KEY) === "1";
  } catch {
    // 사파리 프라이빗 모드 등에서 저장소 접근이 막힘.
    return false;
  }
};

const writeIsStatsEnabled = (isEnabled: boolean): void => {
  try {
    window.localStorage.setItem(STATS_ENABLED_STORAGE_KEY, isEnabled ? "1" : "0");
  } catch {
    // 기억하지 못해도 지금 화면의 스위치는 동작함.
  }
};

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
  /** 모바일 여부. 성능 콜백에서 읽어서 ref 로 둠. */
  const isMobileRef = useRef<boolean>(false);
  /**
   * 계측 패널 표시 여부. 조작 안내 창의 "성능 표시" 스위치로 켜고 이 브라우저에 기억함.
   *
   * **운영에서도 켤 수 있음.** 개발 환경에만 두면 실기기 측정이 `pnpm dev` 를 띄운 PC 와
   * 같은 네트워크에 폰을 붙이는 일이 되고, dpr·번들·소스맵이 모두 달라 운영 성능을 대신하지
   * 못함. 전에는 `?stats=1` 쿼리로 켰는데 폰에서 주소를 고쳐 치기 번거로워 스위치로 옮김.
   *
   * 패널에는 렌더 통계와 서버 왕복 시간 외에 아무 정보도 없음. 더미(`?dummies=N`)는 운영에서
   * 계속 막음 — 가짜 아바타 50명은 실제 접속자에게 보이고 좌석을 혼동시킴.
   */
  const [hasPerformanceStats, setHasPerformanceStats] = useState<boolean>(readIsStatsEnabled);
  /** 캔버스 안 측정기가 내보낸 렌더 통계. 패널은 HUD 가 채팅창 아래에 그림. 계측을 안 켰으면 `null`. */
  const [performanceSummary, setPerformanceSummary] = useState<SpacePerformanceSummary | null>(
    null,
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
  /**
   * 여기서 쓰는 세션 상태. 조각별로 구독해서, 대화 · 입퇴장처럼 이 컴포넌트와 무관한
   * 변화에는 다시 그리지 않음. 내 정보는 자리(`x` · `z`)가 보정될 때도 바뀌어 필드로 쪼갬.
   */
  const market = useSpaceSessionSelector(session, (snapshot) => snapshot.market);
  const serverClockOffsetMs = useSpaceSessionSelector(
    session,
    (snapshot) => snapshot.serverClockOffsetMs,
  );
  const hallBgm = useSpaceSessionSelector(session, (snapshot) => snapshot.hallBgm);
  const sessionCelebration = useSpaceSessionSelector(session, (snapshot) => snapshot.celebration);
  const selfSeat = useSpaceSessionSelector(session, (snapshot) => snapshot.self?.seat);
  const selfNickname = useSpaceSessionSelector(session, (snapshot) => snapshot.self?.nickname);
  const selfModelIndex = useSpaceSessionSelector(session, (snapshot) => snapshot.self?.modelIndex);
  const presenceStatus = useSpaceSessionSelector(session, (snapshot) => snapshot.presence.status);
  const hasSessionError = useSpaceSessionSelector(session, (snapshot) => snapshot.error !== null);
  const canSyncMarket = useSpaceSessionSelector(session, (snapshot) => snapshot.canSyncMarket);
  const bgm = useSpaceBgm({
    market,
    serverClockOffsetMs,
    hallBgm,
    zoneTrack: useSpaceBgmZone(session),
  });
  const celebration = dummyCount > 0 ? localCelebration : sessionCelebration;
  const celebrationClockOffsetMs = dummyCount > 0 ? 0 : serverClockOffsetMs;
  const isTestRequester = celebration?.testSeat !== undefined && celebration.testSeat === selfSeat;
  useScreenCelebrationSound(
    celebration,
    celebrationClockOffsetMs,
    bgm.isPlaying || isTestRequester || dummyCount > 0,
  );
  /** 효과음도 배경음악 설정을 따름. 음악을 끈 사람은 조용히 있고 싶은 사람임. */
  const playSfx = useSpaceSfx(bgm.isPlaying);
  const bossKilledAt = useSpaceSessionSelector(
    session,
    (snapshot) => snapshot.bossDefeat?.killedAt,
  );
  /** 입장 로딩 신호. 한 번 켜지면 끄지 않음 — 모델을 바꿔도 오버레이를 다시 띄우지 않음. */
  const [isMapReady, setIsMapReady] = useState<boolean>(false);
  const [isAvatarReady, setIsAvatarReady] = useState<boolean>(false);
  const [isServerTimedOut, setIsServerTimedOut] = useState<boolean>(false);
  const [isLoadingHardTimedOut, setIsLoadingHardTimedOut] = useState<boolean>(false);
  const nickname = selfNickname ?? identity.nickname;
  const modelIndex = selfModelIndex ?? localModelIndex;
  /** 캔버스에 건 컨텍스트 복구 리스너를 떼는 함수. 캔버스가 만들어질 때 채움. */
  const detachContextRecoveryRef = useRef<(() => void) | null>(null);

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
   * 흐림. 여유가 있으면 기기별 상한까지 올리고, 모자라면 다시 내림.
   *
   * 모바일은 내리기만 함. 해상도를 바꿀 때마다 화면 버퍼를 다시 잡아 그 순간 끊기는데,
   * 레이드처럼 부하가 오르내리는 장면에서 올렸다 내렸다 하면 계속 버벅였음.
   */
  const onChangePerformance = useCallback(({ factor }: PerformanceMonitorApi): void => {
    const nextDpr = resolveDprFromPerformanceFactor(factor, dprPolicyRef.current);

    setRenderDpr((currentDpr) => (isMobileRef.current ? Math.min(currentDpr, nextDpr) : nextDpr));
  }, []);

  const onFallbackPerformance = useCallback((): void => {
    setRenderDpr(dprPolicyRef.current.min);
  }, []);

  const onTogglePerformanceStats = useCallback((): void => {
    setHasPerformanceStats((wasEnabled) => {
      writeIsStatsEnabled(!wasEnabled);

      return !wasEnabled;
    });
    // 끄면 패널도 내림. 켜면 측정기가 곧 새 요약을 내보냄.
    setPerformanceSummary(null);
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
      // 폴백에서 돌아오면 캔버스가 새로 만들어짐. 옛 캔버스에 건 것을 먼저 뗌.
      detachContextRecoveryRef.current?.();
      detachContextRecoveryRef.current = attachContextRecovery(rootState.gl.domElement);
    },
    [attachContextRecovery],
  );
  // endregion

  // region [Life Cycles]
  useEffect(() => {
    // 화면을 떠날 때 리스너와 복구 대기 타이머를 정리함. 안 하면 떠난 뒤에 타이머가 폴백 상태를 건드림.
    return () => {
      detachContextRecoveryRef.current?.();
      detachContextRecoveryRef.current = null;
    };
  }, []);

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
    const isMobile = isIOSDevice() || isAndroidDevice();
    const dprPolicy = resolveDprPolicy(isMobile, window.devicePixelRatio);

    isMobileRef.current = isMobile;
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
        presenceStatus,
        hasSessionError,
        isConnectionConfigured: session.isConnectionConfigured,
        isDummyMode: dummyCount > 0,
        isServerTimedOut,
      }),
    }),
    [
      isMapReady,
      isAvatarReady,
      presenceStatus,
      hasSessionError,
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
    <SpaceSessionContext value={session}>
      <div className="relative h-full w-full overflow-hidden bg-[#06080e]">
        <Canvas
          dpr={renderDpr}
          frameloop={frameloop}
          shadows={hasRealtimeShadows}
          camera={{ fov: SPACE_CAMERA.fov, near: CAMERA_NEAR, far: CAMERA_FAR }}
          gl={{
            // 모바일은 끔. 기기 해상도에 가깝게(2 ~ 2.5 배) 그려 계단이 덜 보이는데, 그 위에
            // MSAA 까지 얹으면 픽셀 수가 많은 만큼 비용이 큼. 컨텍스트를 만들 때만 읽는 값이고,
            // 기기 판별(`isMobileRef`)은 캔버스가 뜨기 전에 끝남.
            antialias: !isMobileRef.current,
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
              hasRealtimeShadows={hasRealtimeShadows}
              dummyCount={dummyCount}
              onReadyMap={onReadyMap}
              onReadyAvatar={onReadyAvatar}
              playSfx={playSfx}
            />
          </Suspense>
          {hasPerformanceStats && <SpacePerformanceStats onPublish={setPerformanceSummary} />}
        </Canvas>

        <SpaceHud
          bgm={bgm}
          canTestCelebration={
            hasCelebrationTest && (dummyCount > 0 || (canSyncMarket && presenceStatus === "online"))
          }
          onCelebrate={onCelebrate}
          inputSource={inputSource}
          nickname={nickname}
          modelIndex={modelIndex}
          onChangeModel={onChangeModel}
          performanceSummary={hasPerformanceStats ? performanceSummary : null}
          isPerformanceStatsEnabled={hasPerformanceStats}
          onTogglePerformanceStats={onTogglePerformanceStats}
          dummyCount={dummyCount}
        />

        <SpaceLoadingOverlay stages={loadStages} isHardTimedOut={isLoadingHardTimedOut} />
      </div>
    </SpaceSessionContext>
  );
}

const MemoizedSpaceCanvas = memo(SpaceCanvas);
MemoizedSpaceCanvas.displayName = "SpaceCanvas";

export default MemoizedSpaceCanvas;
