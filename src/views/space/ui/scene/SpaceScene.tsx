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
import { type Group, PerspectiveCamera } from "three";
import {
  createFlatTerrain,
  createLocalPlayerState,
  createSpawnPoint,
  type LocalPlayerState,
  resolveColorIndexFromClientKey,
  SPACE_HALL,
  SPACE_MENU_FRAME,
  SPACE_SCREEN_PLACEMENTS,
  type SpacePeer,
  type SpaceTerrain,
} from "@/entities/space";
import {
  applyCameraDrag,
  applyCameraZoom,
  applyKeyboardYaw,
  approachCollisionDistance,
  type CameraOrbit,
  consumePendingDrag,
  consumePendingZoom,
  createDefaultCameraOrbit,
  dampVector,
  planFixedSteps,
  resolveCameraFocus,
  resolveCameraLookTarget,
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
import { SPACE_FRAME_PRIORITY } from "@/views/space/lib/framePriority";
import type { LanternAnchor } from "@/views/space/lib/hallModel";
import type { HallTerrain } from "@/views/space/lib/hallTerrain";
import { advanceStressDummies, createStressDummies } from "@/views/space/lib/stressDummies";
import BlockDashboard from "./BlockDashboard";
import ChatBubbles from "./ChatBubbles";
import Hall from "./Hall";
import MenuGraffiti from "./MenuGraffiti";
import Nameplates from "./Nameplates";
import PlayerAvatar from "./PlayerAvatar";
import PriceBillboard from "./PriceBillboard";
import RemoteAvatars from "./RemoteAvatars";
import SceneLighting from "./SceneLighting";
import SpaceTicker from "./SpaceTicker";

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
  /** 맵 지형이 잡혔을 때. 입장 로딩 오버레이가 기다림. */
  onReadyMap?: () => void;
  /** 내 캐릭터 모델이 올라왔을 때. 입장 로딩 오버레이가 기다림. */
  onReadyAvatar?: () => void;
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
  onReadyMap,
  onReadyAvatar,
}: SpaceSceneProps): ReactNode {
  // region [Hooks]
  const canvasElement = useThree((rootState) => rootState.gl.domElement);
  const camera = useThree((rootState) => rootState.camera);
  const viewportSize = useThree((rootState) => rootState.size);
  const prefersReducedMotion = usePrefersReducedMotion();
  const isCoarsePointer = useCoarsePointer();

  /** 손가락 기기는 가장 멀리 물러나 시작해 전광판과 라운지가 한 화면에 들어오게 함. */
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
   * GLB 가 도착하기 전에는 홀 바닥 높이의 평지다. 그 사이에도 걸을 수 있고,
   * 맵이 붙는 순간 발밑이 실제 지형으로 바뀐다. 상태가 아니라 ref 인 이유는
   * `useFrame` 안에서만 읽기 때문이다 — 상태로 올리면 맵 도착이 씬 전체
   * 리렌더가 된다.
   */
  const terrainRef = useRef<SpaceTerrain>(createFlatTerrain());
  /** 카메라 충돌용. 지형과 달리 평지 대체본이 없어 도착 전에는 건너뛴다. */
  const hallTerrainRef = useRef<HallTerrain | null>(null);
  /**
   * 지형이 허용하는 카메라 거리 상한. 막히면 즉시 줄고 풀리면 천천히 는다.
   *
   * 최대 거리로 시작한다. 0 으로 두면 첫 프레임에 카메라가 머리에 붙었다가
   * 밀려 나오는 것이 보인다.
   */
  const allowedCameraDistanceRef = useRef<number>(SPACE_CAMERA.maxDistance);
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
    // 순간이동 뒤에는 옛 상한에서 천천히 풀릴 이유가 없다.
    allowedCameraDistanceRef.current = SPACE_CAMERA.maxDistance;
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
   * 맵 밖으로 빠진 플레이어를 스폰 지점으로 되돌린다.
   *
   * 지형이 발밑에 아무것도 없다고 하면(`-Infinity`) 그대로 떨어지는데, 라운지
   * 바닥보다 내려간 순간이 그 신호임. 맵에 뚫린 구멍이 어디든 한 곳에서 받아냄.
   *
   * **`publishMovement` 보다 먼저 돌아야 한다.** 서버는 `y < 0` 을 거절하므로
   * 음수 좌표가 한 번이라도 나가면 이동이 반려되고 화면이 튄다.
   *
   * 카메라 궤도의 yaw 도 스폰 방향으로 돌린다. 거리·피치는 사용자가 맞춰 둔
   * 값이라 건드리지 않는다.
   */
  const resolveFallOut = (playerState: LocalPlayerState): LocalPlayerState => {
    if (playerState.y >= SPACE_HALL.fallResetY) {
      return playerState;
    }

    const respawned = createLocalPlayerState(spawnTransform);

    playerStateRef.current = respawned;
    accumulatedSecondsRef.current = 0;
    cameraOrbitRef.current = { ...cameraOrbitRef.current, yaw: spawnTransform.yaw };
    smoothedCameraRef.current = resolveCameraPosition(spawnTransform, cameraOrbitRef.current);
    allowedCameraDistanceRef.current = SPACE_CAMERA.maxDistance;
    applyPlayerTransform(respawned);

    return respawned;
  };

  /**
   * 지형을 파고들지 않는 카메라 위치.
   *
   * 감쇠 **뒤에** 건다. 감쇠 전에 걸면 목표만 당겨지고 실제 카메라는 한 박자
   * 늦게 따라와서, 벽에 붙는 순간 한 프레임 동안 벽 안이 보인다.
   *
   * 지형이 허용하는 **거리 상한**을 따로 들고 비대칭으로 따라간다. 당길 때는
   * 즉시, 풀 때는 감쇠다. 기둥·부스 옆을 지날 때 카메라가 튕기는 것이
   * 멀미의 주범이라 푸는 쪽만 늦춘다. 사용자가 줌을 바꾼 거리는 이 상한과
   * 무관하게 `Math.min` 으로 그대로 반영된다 — 상한에 감쇠를 걸었다고
   * 줌아웃까지 늦어지면 조작이 둔해진다.
   */
  const resolveSafeCameraPosition = (
    focus: Vector3Like,
    position: Vector3Like,
    deltaSeconds: number,
  ): Vector3Like => {
    const offsetX = position.x - focus.x;
    const offsetY = position.y - focus.y;
    const offsetZ = position.z - focus.z;
    const desiredDistance = Math.hypot(offsetX, offsetY, offsetZ);

    if (desiredDistance < 1e-3) {
      return position;
    }

    const blocked =
      hallTerrainRef.current?.resolveCameraPosition(focus, position, SPACE_CAMERA.boundaryMargin) ??
      position;
    const blockedDistance = Math.hypot(
      blocked.x - focus.x,
      blocked.y - focus.y,
      blocked.z - focus.z,
    );
    const allowedDistance = approachCollisionDistance(
      allowedCameraDistanceRef.current,
      blockedDistance,
      deltaSeconds,
    );

    allowedCameraDistanceRef.current = allowedDistance;

    const scale = Math.min(desiredDistance, allowedDistance) / desiredDistance;

    return {
      x: focus.x + offsetX * scale,
      y: focus.y + offsetY * scale,
      z: focus.z + offsetZ * scale,
    };
  };
  // endregion

  // region [Events]
  const onReadyTerrain = useCallback(
    (terrain: HallTerrain): void => {
      hallTerrainRef.current = terrain;
      onReadyMap?.();
    },
    [onReadyMap],
  );

  const onReadyLanterns = useCallback((anchors: readonly LanternAnchor[]): void => {
    setLanternAnchors(anchors);
  }, []);
  // endregion

  // region [Life Cycles]
  useLayoutEffect(() => {
    // 첫 프레임이 원점에서 날아오지 않도록 카메라를 스폰 지점 궤도에 미리 둔다.
    const initialPosition = smoothedCameraRef.current;
    const initialFocus = resolveCameraFocus(spawnTransform);
    const initialLookTarget = resolveCameraLookTarget(
      initialFocus,
      initialPosition,
      cameraOrbitRef.current.pitch,
    );

    camera.position.set(initialPosition.x, initialPosition.y, initialPosition.z);
    camera.lookAt(initialLookTarget.x, initialLookTarget.y, initialLookTarget.z);
    // 브라우저 기본 제스처가 드래그 회전을 가로채지 않게 한다.
    canvasElement.style.touchAction = "none";
  }, [camera, canvasElement, spawnTransform]);

  useLayoutEffect(() => {
    if (!(camera instanceof PerspectiveCamera)) {
      return;
    }

    const { width, height } = viewportSize;
    const framingShift = isCoarsePointer
      ? SPACE_CAMERA.touchFramingShift
      : SPACE_CAMERA.desktopFramingShift;

    // 렌즈를 위로 옮기면 화면 속 아바타가 아래로 내려감. 크기가 바뀔 때마다 다시 맞춤.
    if (framingShift > 0 && width > 0 && height > 0) {
      camera.setViewOffset(width, height, 0, -height * framingShift, width, height);
    } else {
      camera.clearViewOffset();
    }

    camera.updateProjectionMatrix();
  }, [camera, viewportSize, isCoarsePointer]);

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
    const steppedState = advancePlayerState(cameraOrbit.yaw, deltaSeconds);
    applyPlayerTransform(steppedState);

    // 맵 밖으로 빠졌으면 여기서 스폰으로 되돌아온다. 되돌린 궤도를 쓰려고 아래
    // 카메라 계산은 지역 변수가 아니라 ref 를 다시 읽는다.
    const playerState = resolveFallOut(steppedState);

    session.publishMovement(playerState);

    const focus = resolveCameraFocus(playerState);
    const targetPosition = resolveCameraPosition(playerState, cameraOrbitRef.current);
    const dampedPosition = dampVector(
      smoothedCameraRef.current,
      targetPosition,
      resolveFollowDamping(prefersReducedMotion),
      deltaSeconds,
    );
    smoothedCameraRef.current = dampedPosition;

    const safePosition = resolveSafeCameraPosition(focus, dampedPosition, deltaSeconds);
    camera.position.set(safePosition.x, safePosition.y, safePosition.z);

    // 궤도 한계보다 위를 보면 카메라는 멈추고 시선만 듦. 벽 충돌은 위에서 머리
    // 기준으로 이미 끝났으니 바라보는 방향만 바꿈.
    const lookTarget = resolveCameraLookTarget(focus, safePosition, cameraOrbitRef.current.pitch);
    camera.lookAt(lookTarget.x, lookTarget.y, lookTarget.z);
  }, SPACE_FRAME_PRIORITY.simulation);
  // endregion

  return (
    <>
      <SceneLighting
        hasRealtimeShadows={hasRealtimeShadows}
        playerStateRef={playerStateRef}
        lanternAnchors={lanternAnchors}
      />

      {/*
        맵은 따로 매달아 둔다. Draco 를 푸는 동안 씬 전체가 멈추면 아바타도
        안 보임. 그 사이 발밑은 홀 바닥 높이의 평지라 걸어다닐 수는 있다.
      */}
      <Suspense fallback={null}>
        <Hall
          terrainRef={terrainRef}
          onReadyTerrain={onReadyTerrain}
          onReadyLanterns={onReadyLanterns}
        />
      </Suspense>

      {/* 메인 전광판 액자(28 × 10.5) 왼쪽 반쪽에 시세판을 끼움. */}
      <group
        position={SPACE_SCREEN_PLACEMENTS.billboard.position}
        rotation={[0, SPACE_SCREEN_PLACEMENTS.billboard.rotationY, 0]}
        scale={SPACE_SCREEN_PLACEMENTS.billboard.scale}
      >
        <PriceBillboard />
      </group>

      {/* 액자 위 가로 띠(28 × 2)에 지표 티커를 흘림. */}
      <SpaceTicker />

      {/* 같은 액자 오른쪽 반쪽에 네트워크 현황판을 끼움. */}
      <group
        position={SPACE_SCREEN_PLACEMENTS.blockDashboard.position}
        rotation={[0, SPACE_SCREEN_PLACEMENTS.blockDashboard.rotationY, 0]}
        scale={SPACE_SCREEN_PLACEMENTS.blockDashboard.scale}
      >
        <BlockDashboard />
      </group>

      {/* 커피 바 메뉴판 자리(6 × 2.5)에 분필 낙서판을 끼움. */}
      <group position={SPACE_MENU_FRAME.position} rotation={[0, SPACE_MENU_FRAME.rotationY, 0]}>
        <MenuGraffiti />
      </group>

      <group ref={playerGroupRef}>
        {/*
          아바타를 처음 받는 모델로 바꾸면 여기서 서스펜드함. 경계가 없으면 씬
          전체가 비고, 있으면 아바타만 잠깐 빠짐.
        */}
        <Suspense fallback={null}>
          <PlayerAvatar
            colorIndex={avatarColorIndex}
            modelIndex={avatarModelIndex}
            hasRealtimeShadows={hasRealtimeShadows}
            playerStateRef={playerStateRef}
            onReady={onReadyAvatar}
          />
        </Suspense>
      </group>

      <RemoteAvatars
        players={remotePlayers}
        rosterRevision={session.rosterRevision}
        terrainRef={terrainRef}
      />
      <Nameplates
        players={remotePlayers}
        selfNickname={nickname}
        selfModelIndex={avatarModelIndex}
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
