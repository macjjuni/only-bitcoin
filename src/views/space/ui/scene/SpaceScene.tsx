"use client";

import { useFrame, useThree } from "@react-three/fiber";
import {
  memo,
  type ReactNode,
  Suspense,
  useCallback,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type { Group } from "three";
import {
  createFlatTerrain,
  createLocalPlayerState,
  createSpawnPoint,
  type LocalPlayerState,
  resolveColorIndexFromClientKey,
  SPACE_SCREEN_PLACEMENTS,
  SPACE_SCREEN_SCALE,
  type SpacePeer,
  type SpaceTerrain,
} from "@/entities/space";
import {
  applyCameraDrag,
  applyCameraZoom,
  applyKeyboardYaw,
  type CameraOrbit,
  consumePendingDrag,
  consumePendingZoom,
  createDefaultCameraOrbit,
  dampVector,
  planFixedSteps,
  resolveCameraFocus,
  resolveCameraPosition,
  resolveFollowDamping,
  resolveMergedMovementInput,
  SPACE_CAMERA,
  type SpaceInputSource,
  stepMovement,
  useCoarsePointer,
  usePointerDrag,
  usePrefersReducedMotion,
  type Vector3Like,
} from "@/features/space-controls";
import type { SpaceSession } from "@/features/space-session";
import { spaceConfig } from "@/shared/config/space";
import type { LanternAnchor } from "@/views/space/lib/islandModel";
import type { IslandTerrain } from "@/views/space/lib/islandTerrain";
import { advanceStressDummies, createStressDummies } from "@/views/space/lib/stressDummies";
import { createEmptyAdTextSlot } from "@/views/space/lib/textBannerTexture";
import BlockDashboard from "./BlockDashboard";
import ChatBubbles from "./ChatBubbles";
import Island from "./Island";
import Nameplates from "./Nameplates";
import PlayerAvatar from "./PlayerAvatar";
import PriceBillboard from "./PriceBillboard";
import RemoteAvatars from "./RemoteAvatars";
import SceneLighting, { SKY_FALLBACK_COLOR } from "./SceneLighting";
import SkyBackground from "./SkyBackground";
import TextAdBanner from "./TextAdBanner";

interface SpaceSceneProps {
  inputSource: SpaceInputSource;
  clientKey: string;
  nickname: string;
  /** 접속 전에 보여줄 모델. 서버가 확정하면 그 값이 우선한다. */
  modelIndex: number;
  session: SpaceSession;
  hasRealtimeShadows: boolean;
  /** 개발 전용 더미 아바타 수. 더미 측정 중에는 실제 공간 소켓을 열지 않는다. */
  dummyCount: number;
}

const EMPTY_LANTERN_ANCHORS: readonly LanternAnchor[] = [];

function SpaceScene({
  inputSource,
  clientKey,
  nickname,
  modelIndex,
  session,
  hasRealtimeShadows,
  dummyCount,
}: SpaceSceneProps): ReactNode {
  // region [Hooks]
  const canvasElement = useThree((rootState) => rootState.gl.domElement);
  const camera = useThree((rootState) => rootState.camera);
  const prefersReducedMotion = usePrefersReducedMotion();
  const isCoarsePointer = useCoarsePointer();

  /** 손가락 기기는 가장 멀리 물러나 시작해 섬 전체가 한 화면에 들어오게 한다. */
  const initialCameraDistance = isCoarsePointer
    ? SPACE_CAMERA.touchInitialDistance
    : SPACE_CAMERA.defaultDistance;

  const spawnTransform = useMemo(() => createSpawnPoint(clientKey), [clientKey]);
  const colorIndex = useMemo(() => resolveColorIndexFromClientKey(clientKey), [clientKey]);
  const avatarColorIndex = session.self?.colorIndex ?? colorIndex;
  /** 서버가 확정한 모델을 쓴다. 접속 전에는 저장된 선택으로 보여준다. */
  const avatarModelIndex = session.self?.modelIndex ?? modelIndex;
  const dummies = useMemo(() => createStressDummies(dummyCount), [dummyCount]);
  const remotePlayers = dummyCount > 0 ? dummies : session.remotePlayers;
  /** 1단계는 빈 슬롯이다. 3단계에서 라이트닝 결제로 채운다. */
  const textAdSlot = useMemo(() => createEmptyAdTextSlot(), []);

  const playerStateRef = useRef<LocalPlayerState>(createLocalPlayerState(spawnTransform));
  const cameraOrbitRef = useRef<CameraOrbit>(
    createDefaultCameraOrbit(spawnTransform.yaw, initialCameraDistance),
  );
  const smoothedCameraRef = useRef<Vector3Like>(
    resolveCameraPosition(spawnTransform, cameraOrbitRef.current),
  );
  const accumulatedSecondsRef = useRef<number>(0);
  const playerGroupRef = useRef<Group>(null);
  /**
   * 지형 질의.
   *
   * GLB 가 도착하기 전에는 광장 높이의 평지다. 그 사이에도 걸을 수 있고,
   * 맵이 붙는 순간 발밑이 실제 지형으로 바뀐다. 상태가 아니라 ref 인 이유는
   * `useFrame` 안에서만 읽기 때문이다 — 상태로 올리면 맵 도착이 씬 전체
   * 리렌더가 된다.
   */
  const terrainRef = useRef<SpaceTerrain>(createFlatTerrain());
  /** 카메라 충돌용. 지형과 달리 평지 대체본이 없어 도착 전에는 건너뛴다. */
  const islandTerrainRef = useRef<IslandTerrain | null>(null);
  /**
   * 랜턴 자리.
   *
   * 조명 컴포넌트가 `props` 로 받아야 해서 여기서는 상태로 둔다. 맵이 도착할
   * 때 한 번만 바뀌고, 그 한 번은 조명이 실제로 다시 그려져야 하는 순간이다.
   */
  const [lanternAnchors, setLanternAnchors] =
    useState<readonly LanternAnchor[]>(EMPTY_LANTERN_ANCHORS);

  usePointerDrag(inputSource, canvasElement);
  // endregion

  /** 서버 보정으로 볼 최소 거리(m). 좌표를 1 cm 로 접어 보내므로 그보다 크게 잡는다. */
  const SERVER_CORRECTION_THRESHOLD = 0.05;

  // region [Privates]
  const applyServerTransform = useCallback((peer: SpacePeer): void => {
    playerStateRef.current = createLocalPlayerState(peer);
    accumulatedSecondsRef.current = 0;
    smoothedCameraRef.current = resolveCameraPosition(peer, cameraOrbitRef.current);
    playerGroupRef.current?.position.set(peer.x, peer.y, peer.z);
    playerGroupRef.current?.rotation.set(0, peer.yaw, 0);
  }, []);

  const advanceCameraOrbit = (deltaSeconds: number): CameraOrbit => {
    const { deltaX, deltaY } = consumePendingDrag(inputSource);
    const draggedOrbit = applyCameraDrag(cameraOrbitRef.current, deltaX, deltaY);
    const zoomedOrbit = applyCameraZoom(draggedOrbit, consumePendingZoom(inputSource));
    const nextOrbit =
      inputSource.yawDirection === 0
        ? zoomedOrbit
        : applyKeyboardYaw(zoomedOrbit, inputSource.yawDirection, deltaSeconds);

    cameraOrbitRef.current = nextOrbit;

    return nextOrbit;
  };

  const advancePlayerState = (cameraYaw: number, deltaSeconds: number): LocalPlayerState => {
    const movementInput = resolveMergedMovementInput(inputSource);

    accumulatedSecondsRef.current += deltaSeconds;

    const stepPlan = planFixedSteps(accumulatedSecondsRef.current);
    accumulatedSecondsRef.current = stepPlan.remainder;

    let nextState = playerStateRef.current;

    for (let stepIndex = 0; stepIndex < stepPlan.stepCount; stepIndex += 1) {
      nextState = stepMovement(nextState, movementInput, cameraYaw, undefined, terrainRef.current);
    }

    playerStateRef.current = nextState;

    return nextState;
  };

  const applyPlayerTransform = (playerState: LocalPlayerState): void => {
    const playerGroup = playerGroupRef.current;

    if (!playerGroup) {
      return;
    }

    playerGroup.position.set(playerState.x, playerState.y, playerState.z);
    playerGroup.rotation.set(0, playerState.yaw, 0);
  };

  /**
   * 지형을 파고들지 않는 카메라 위치.
   *
   * 감쇠 **뒤에** 건다. 감쇠 전에 걸면 목표만 당겨지고 실제 카메라는 한 박자
   * 늦게 따라와서, 벽에 붙는 순간 한 프레임 동안 벽 안이 보인다.
   */
  const resolveSafeCameraPosition = (focus: Vector3Like, position: Vector3Like): Vector3Like => {
    return (
      islandTerrainRef.current?.resolveCameraPosition(
        focus,
        position,
        SPACE_CAMERA.boundaryMargin,
      ) ?? position
    );
  };
  // endregion

  // region [Events]
  const onReadyTerrain = useCallback((terrain: IslandTerrain): void => {
    islandTerrainRef.current = terrain;
  }, []);

  const onReadyLanterns = useCallback((anchors: readonly LanternAnchor[]): void => {
    setLanternAnchors(anchors);
  }, []);
  // endregion

  // region [Life Cycles]
  useLayoutEffect(() => {
    // 첫 프레임이 원점에서 날아오지 않도록 카메라를 스폰 지점 궤도에 미리 둔다.
    const initialPosition = smoothedCameraRef.current;
    const initialFocus = resolveCameraFocus(spawnTransform);

    camera.position.set(initialPosition.x, initialPosition.y, initialPosition.z);
    camera.lookAt(initialFocus.x, initialFocus.y, initialFocus.z);
    // 브라우저 기본 제스처가 드래그 회전을 가로채지 않게 한다.
    canvasElement.style.touchAction = "none";
  }, [camera, canvasElement, spawnTransform]);

  useLayoutEffect(() => {
    const self = session.self;

    if (!self) {
      return;
    }
    // 닉네임만 바뀐 peer 프레임에 위치를 되감으면 캐릭터가 뒤로 튄다. 서버가
    // 이동을 거절했을 때만 좌표가 실제로 달라지므로 양자화 오차로 가른다.
    const state = playerStateRef.current;
    const gap = Math.hypot(self.x - state.x, self.y - state.y, self.z - state.z);

    if (gap > SERVER_CORRECTION_THRESHOLD) {
      applyServerTransform(self);
    }
  }, [session.self, applyServerTransform]);

  useFrame(({ clock }, deltaSeconds) => {
    session.sampleRemotePlayers(performance.now());
    if (dummies.length > 0) {
      advanceStressDummies(dummies, clock.elapsedTime);
    }

    const cameraOrbit = advanceCameraOrbit(deltaSeconds);
    const playerState = advancePlayerState(cameraOrbit.yaw, deltaSeconds);
    applyPlayerTransform(playerState);
    session.publishMovement(playerState);

    const focus = resolveCameraFocus(playerState);
    const targetPosition = resolveCameraPosition(playerState, cameraOrbit);
    const dampedPosition = dampVector(
      smoothedCameraRef.current,
      targetPosition,
      resolveFollowDamping(prefersReducedMotion),
      deltaSeconds,
    );
    smoothedCameraRef.current = dampedPosition;

    const safePosition = resolveSafeCameraPosition(focus, dampedPosition);
    camera.position.set(safePosition.x, safePosition.y, safePosition.z);
    camera.lookAt(focus.x, focus.y, focus.z);
  }, -1);
  // endregion

  return (
    <>
      <SceneLighting
        hasRealtimeShadows={hasRealtimeShadows}
        playerStateRef={playerStateRef}
        lanternAnchors={lanternAnchors}
      />

      {/*
        360° 파노라마 하늘. 받는 동안에는 단색으로 버틴다 — 맵과 같은
        경계에 묶으면 하늘 한 장 때문에 섬까지 늦게 뜬다.
      */}
      <Suspense fallback={<color attach="background" args={[SKY_FALLBACK_COLOR]} />}>
        <SkyBackground />
      </Suspense>

      {/*
        맵은 따로 매달아 둔다. 0.57 MB 를 받고 Draco 를 푸는 동안 씬 전체가
        멈추면 아바타도 HUD 뒤 빈 화면도 아무것도 안 보인다. 그 사이 발밑은
        광장 높이의 평지라 걸어다닐 수는 있다.
      */}
      <Suspense fallback={null}>
        <Island
          terrainRef={terrainRef}
          onReadyTerrain={onReadyTerrain}
          onReadyLanterns={onReadyLanterns}
          hasRealtimeShadows={hasRealtimeShadows}
        />
      </Suspense>

      {/*
        광장 양옆 금장 액자에 실시간 패널을 끼운다. 액자 안쪽 홈이 6 × 2.75 라
        설계 치수(9.6 × 5.4)를 높이에 맞춰 줄인다. 위치·회전은 GLB 의
        `Screen_*` 쿼드에서 읽은 값이다.
      */}
      <group
        position={SPACE_SCREEN_PLACEMENTS.billboard.position}
        rotation={[0, SPACE_SCREEN_PLACEMENTS.billboard.rotationY, 0]}
        scale={SPACE_SCREEN_SCALE}
      >
        <PriceBillboard />

        {/*
          광고를 끄면 표시 면만 빠진다. 끈 동안에는 배너의 캔버스 텍스처도
          만들지 않는다.
        */}
        {spaceConfig.isAdEnabled && <TextAdBanner slot={textAdSlot} />}
      </group>

      <group
        position={SPACE_SCREEN_PLACEMENTS.blockDashboard.position}
        rotation={[0, SPACE_SCREEN_PLACEMENTS.blockDashboard.rotationY, 0]}
        scale={SPACE_SCREEN_SCALE}
      >
        <BlockDashboard />
      </group>

      <group ref={playerGroupRef}>
        <PlayerAvatar
          colorIndex={avatarColorIndex}
          modelIndex={avatarModelIndex}
          hasRealtimeShadows={hasRealtimeShadows}
          playerStateRef={playerStateRef}
        />
      </group>

      <RemoteAvatars players={remotePlayers} rosterRevision={session.rosterRevision} />
      <Nameplates
        players={remotePlayers}
        selfNickname={nickname}
        isCoarsePointer={isCoarsePointer}
        rosterRevision={session.rosterRevision}
        viewerTransformRef={playerStateRef}
      />
      <ChatBubbles
        messages={session.bubbleMessages}
        players={remotePlayers}
        self={session.self}
        viewerTransformRef={playerStateRef}
      />
    </>
  );
}

const MemoizedSpaceScene = memo(SpaceScene);
MemoizedSpaceScene.displayName = "SpaceScene";

export default MemoizedSpaceScene;
