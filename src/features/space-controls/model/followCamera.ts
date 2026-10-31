import type { PlayerTransform } from "@/entities/space";

const toRadians = (degrees: number): number => (degrees * Math.PI) / 180;

/** 카메라 튜닝 값. 근거는 `docs/btc-space-3d.md` §5 에 있다. */
export const SPACE_CAMERA = {
  distance: 7,
  defaultPitch: toRadians(-12),
  minPitch: toRadians(-35),
  maxPitch: toRadians(5),
  /** 드래그 1 px 당 yaw 회전량(라디안). */
  dragSensitivity: toRadians(0.25),
  /** 키보드 전용 시야 회전 속도(라디안/초). */
  keyboardYawRate: toRadians(90),
  followDamping: 8,
  /** 모션 축소 환경에서는 감쇠를 올려 흔들림을 줄인다. */
  reducedMotionFollowDamping: 20,
  fov: 55,
} as const;

/**
 * 카메라가 바라보는 지점의 높이.
 *
 * 기본 피치에서 카메라 높이가 규격서의 3.2 가 되도록 역산한 값이며,
 * 결과적으로 아바타 머리(약 1.81) 근처를 주시한다.
 */
export const SPACE_CAMERA_FOCUS_HEIGHT =
  3.2 + SPACE_CAMERA.distance * Math.sin(SPACE_CAMERA.defaultPitch);

export interface CameraOrbit {
  yaw: number;
  pitch: number;
}

export interface Vector3Like {
  x: number;
  y: number;
  z: number;
}

export const createDefaultCameraOrbit = (playerYaw: number): CameraOrbit => ({
  yaw: playerYaw,
  pitch: SPACE_CAMERA.defaultPitch,
});

// region [Privates]
const clamp = (value: number, min: number, max: number): number => {
  return Math.min(Math.max(value, min), max);
};
// endregion

export const clampCameraPitch = (pitch: number): number => {
  return clamp(pitch, SPACE_CAMERA.minPitch, SPACE_CAMERA.maxPitch);
};

/**
 * 포인터 드래그를 궤도 회전에 반영한다.
 *
 * 위로 끌면 시야가 위로 올라가도록 `deltaY` 를 피치에서 뺀다.
 */
export const applyCameraDrag = (
  orbit: CameraOrbit,
  deltaX: number,
  deltaY: number,
): CameraOrbit => ({
  yaw: orbit.yaw + deltaX * SPACE_CAMERA.dragSensitivity,
  pitch: clampCameraPitch(orbit.pitch - deltaY * SPACE_CAMERA.dragSensitivity),
});

/** 포인터 없이 키보드로 시야를 돌린다. `direction` 은 -1 또는 1. */
export const applyKeyboardYaw = (
  orbit: CameraOrbit,
  direction: number,
  deltaSeconds: number,
): CameraOrbit => ({
  yaw: orbit.yaw + direction * SPACE_CAMERA.keyboardYawRate * deltaSeconds,
  pitch: orbit.pitch,
});

/** 플레이어 위에 있는 카메라 주시점. */
export const resolveCameraFocus = (player: PlayerTransform): Vector3Like => ({
  x: player.x,
  y: SPACE_CAMERA_FOCUS_HEIGHT,
  z: player.z,
});

/**
 * 궤도상의 카메라 목표 위치.
 *
 * yaw θ·피치 φ 의 전방 벡터는 `(-sinθ·cosφ, sinφ, -cosθ·cosφ)` 다.
 * 카메라는 주시점에서 전방 반대로 `distance` 만큼 물러난 곳에 둔다.
 * 따라서 음수 피치가 "내려다보기"이며 카메라는 주시점보다 높아진다.
 */
export const resolveCameraPosition = (player: PlayerTransform, orbit: CameraOrbit): Vector3Like => {
  const focus = resolveCameraFocus(player);
  const cosPitch = Math.cos(orbit.pitch);
  const forwardX = -Math.sin(orbit.yaw) * cosPitch;
  const forwardY = Math.sin(orbit.pitch);
  const forwardZ = -Math.cos(orbit.yaw) * cosPitch;

  return {
    x: focus.x - forwardX * SPACE_CAMERA.distance,
    y: focus.y - forwardY * SPACE_CAMERA.distance,
    z: focus.z - forwardZ * SPACE_CAMERA.distance,
  };
};

/**
 * 지수 감쇠 계수. `1 - exp(-λ·dt)` 로 프레임레이트에 무관하게 같은 속도로 따라간다.
 *
 * 선형 보간 계수를 프레임마다 그대로 쓰면 60 fps 와 30 fps 에서 추종 속도가 달라진다.
 */
export const resolveDampFactor = (damping: number, deltaSeconds: number): number => {
  if (deltaSeconds <= 0) {
    return 0;
  }

  return 1 - Math.exp(-damping * deltaSeconds);
};

export const resolveFollowDamping = (prefersReducedMotion: boolean): number => {
  return prefersReducedMotion
    ? SPACE_CAMERA.reducedMotionFollowDamping
    : SPACE_CAMERA.followDamping;
};

/** 현재 위치를 목표 위치로 감쇠 이동시킨 결과. */
export const dampVector = (
  current: Vector3Like,
  target: Vector3Like,
  damping: number,
  deltaSeconds: number,
): Vector3Like => {
  const factor = resolveDampFactor(damping, deltaSeconds);

  return {
    x: current.x + (target.x - current.x) * factor,
    y: current.y + (target.y - current.y) * factor,
    z: current.z + (target.z - current.z) * factor,
  };
};
