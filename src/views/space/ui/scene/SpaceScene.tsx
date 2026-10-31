"use client";

import { useFrame, useThree } from "@react-three/fiber";
import { memo, type ReactNode, useLayoutEffect, useMemo, useRef } from "react";
import type { Group } from "three";
import {
  createLocalPlayerState,
  createSpawnPoint,
  type LocalPlayerState,
  SPACE_AD_BOARDS,
} from "@/entities/space";
import {
  applyCameraDrag,
  applyKeyboardYaw,
  type CameraOrbit,
  consumePendingDrag,
  createDefaultCameraOrbit,
  dampVector,
  planFixedSteps,
  resolveCameraFocus,
  resolveCameraPosition,
  resolveFollowDamping,
  resolveMergedMovementInput,
  type SpaceInputSource,
  stepMovement,
  usePointerDrag,
  usePrefersReducedMotion,
  type Vector3Like,
} from "@/features/space-controls";
import { advanceStressDummies, createStressDummies } from "@/views/space/lib/stressDummies";
import AdBoard from "./AdBoard";
import Ground from "./Ground";
import Nameplates from "./Nameplates";
import PlayerAvatar from "./PlayerAvatar";
import PriceBillboard from "./PriceBillboard";
import RemoteAvatars from "./RemoteAvatars";
import SceneLighting from "./SceneLighting";

interface SpaceSceneProps {
  inputSource: SpaceInputSource;
  clientKey: string;
  hasRealtimeShadows: boolean;
  /** 개발 전용 더미 아바타 수. 0 이면 원격 아바타를 그리지 않는다. */
  dummyCount: number;
}

// region [Privates]
/** 닉네임 없이도 자기 아바타 색이 고정되도록 클라이언트 키에서 뽑는다. */
const resolveColorIndexFromClientKey = (clientKey: string): number => {
  return Array.from(clientKey).reduce((total, character) => total + character.charCodeAt(0), 0);
};
// endregion

function SpaceScene({
  inputSource,
  clientKey,
  hasRealtimeShadows,
  dummyCount,
}: SpaceSceneProps): ReactNode {
  // region [Hooks]
  const canvasElement = useThree((rootState) => rootState.gl.domElement);
  const camera = useThree((rootState) => rootState.camera);
  const prefersReducedMotion = usePrefersReducedMotion();

  const spawnTransform = useMemo(() => createSpawnPoint(clientKey), [clientKey]);
  const colorIndex = useMemo(() => resolveColorIndexFromClientKey(clientKey), [clientKey]);
  const dummies = useMemo(() => createStressDummies(dummyCount), [dummyCount]);

  const playerStateRef = useRef<LocalPlayerState>(createLocalPlayerState(spawnTransform));
  const cameraOrbitRef = useRef<CameraOrbit>(createDefaultCameraOrbit(spawnTransform.yaw));
  const smoothedCameraRef = useRef<Vector3Like>(
    resolveCameraPosition(spawnTransform, createDefaultCameraOrbit(spawnTransform.yaw)),
  );
  const accumulatedSecondsRef = useRef<number>(0);
  const playerGroupRef = useRef<Group>(null);

  usePointerDrag(inputSource, canvasElement);
  // endregion

  // region [Privates]
  const advanceCameraOrbit = (deltaSeconds: number): CameraOrbit => {
    const { deltaX, deltaY } = consumePendingDrag(inputSource);
    const draggedOrbit = applyCameraDrag(cameraOrbitRef.current, deltaX, deltaY);
    const nextOrbit =
      inputSource.yawDirection === 0
        ? draggedOrbit
        : applyKeyboardYaw(draggedOrbit, inputSource.yawDirection, deltaSeconds);

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
      nextState = stepMovement(nextState, movementInput, cameraYaw);
    }

    playerStateRef.current = nextState;

    return nextState;
  };

  const applyPlayerTransform = (playerState: LocalPlayerState): void => {
    const playerGroup = playerGroupRef.current;

    if (!playerGroup) {
      return;
    }

    playerGroup.position.set(playerState.x, 0, playerState.z);
    playerGroup.rotation.set(0, playerState.yaw, 0);
  };
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

  useFrame(({ clock }, deltaSeconds) => {
    if (dummies.length > 0) {
      advanceStressDummies(dummies, clock.elapsedTime);
    }

    const cameraOrbit = advanceCameraOrbit(deltaSeconds);
    const playerState = advancePlayerState(cameraOrbit.yaw, deltaSeconds);
    applyPlayerTransform(playerState);

    const targetPosition = resolveCameraPosition(playerState, cameraOrbit);
    const dampedPosition = dampVector(
      smoothedCameraRef.current,
      targetPosition,
      resolveFollowDamping(prefersReducedMotion),
      deltaSeconds,
    );
    smoothedCameraRef.current = dampedPosition;

    const focus = resolveCameraFocus(playerState);
    camera.position.set(dampedPosition.x, dampedPosition.y, dampedPosition.z);
    camera.lookAt(focus.x, focus.y, focus.z);
  });
  // endregion

  return (
    <>
      <SceneLighting hasRealtimeShadows={hasRealtimeShadows} />
      <Ground hasRealtimeShadows={hasRealtimeShadows} />
      <PriceBillboard />

      {SPACE_AD_BOARDS.map((placement) => (
        <AdBoard key={placement.id} placement={placement} />
      ))}

      <group ref={playerGroupRef}>
        <PlayerAvatar colorIndex={colorIndex} hasRealtimeShadows={hasRealtimeShadows} />
      </group>

      <RemoteAvatars players={dummies} />
      <Nameplates players={dummies} viewerTransformRef={playerStateRef} />
    </>
  );
}

const MemoizedSpaceScene = memo(SpaceScene);
MemoizedSpaceScene.displayName = "SpaceScene";

export default MemoizedSpaceScene;
