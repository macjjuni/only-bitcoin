import { type PlayerTransform, SPACE_CAMERA_BOUNDS, SPACE_WALL_Z } from "@/entities/space";

const toRadians = (degrees: number): number => (degrees * Math.PI) / 180;

/** 카메라 튜닝 값. 근거는 `docs/btc-space-3d.md` §5 에 있다. */
export const SPACE_CAMERA = {
  /** 아바타가 화면 높이의 약 16% 를 차지하는 거리. */
  defaultDistance: 11,
  minDistance: 5,
  maxDistance: 18,
  /**
   * 손가락 기기의 시작 거리. 가장 멀리 물러난 값이다.
   *
   * 세로로 긴 화면은 세로 시야가 넓고 가로가 좁다. 가까이 붙으면 전광판은
   * 커지지만 위아래가 잘려 전광판 위 텍스트 배너까지 한 화면에 들어오지 않는다.
   * 물러나면 벽면 전체가 잡힌다. 시작값일 뿐이라 핀치로 다가갈 수 있다.
   */
  touchInitialDistance: 18,
  /** 휠 deltaY 1 단위당 거리 변화(m). 한 노치(100)에 약 1.2 m. */
  wheelZoomSensitivity: 0.012,
  /** 핀치 1 px 당 거리 변화(m). 200 px 벌리면 약 6 m. */
  pinchZoomSensitivity: 0.03,
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
  /** 카메라가 바닥을 뚫지 않는 최저 높이. */
  minHeight: 0.6,
  /** 뒷벽·바닥 경계에서 띄울 여유. */
  boundaryMargin: 1,
} as const;

/** 카메라가 바라보는 지점의 높이. 아바타 머리(약 1.81) 근처다. */
export const SPACE_CAMERA_FOCUS_HEIGHT = 1.75;

export interface CameraOrbit {
  yaw: number;
  pitch: number;
  /** 주시점과 카메라 사이 거리. 휠·핀치로 바뀐다. */
  distance: number;
}

export interface Vector3Like {
  x: number;
  y: number;
  z: number;
}

// region [Privates]
const clamp = (value: number, min: number, max: number): number => {
  return Math.min(Math.max(value, min), max);
};
// endregion

export const clampCameraPitch = (pitch: number): number => {
  return clamp(pitch, SPACE_CAMERA.minPitch, SPACE_CAMERA.maxPitch);
};

export const clampCameraDistance = (distance: number): number => {
  return clamp(distance, SPACE_CAMERA.minDistance, SPACE_CAMERA.maxDistance);
};

export const createDefaultCameraOrbit = (
  playerYaw: number,
  initialDistance: number = SPACE_CAMERA.defaultDistance,
): CameraOrbit => ({
  yaw: playerYaw,
  pitch: SPACE_CAMERA.defaultPitch,
  distance: clampCameraDistance(initialDistance),
});

/** 누적된 줌 입력(m)을 거리에 반영한다. 양수면 멀어진다. */
export const applyCameraZoom = (orbit: CameraOrbit, distanceDelta: number): CameraOrbit => ({
  yaw: orbit.yaw,
  pitch: orbit.pitch,
  distance: clampCameraDistance(orbit.distance + distanceDelta),
});

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
  distance: orbit.distance,
});

/** 포인터 없이 키보드로 시야를 돌린다. `direction` 은 -1 또는 1. */
export const applyKeyboardYaw = (
  orbit: CameraOrbit,
  direction: number,
  deltaSeconds: number,
): CameraOrbit => ({
  yaw: orbit.yaw + direction * SPACE_CAMERA.keyboardYawRate * deltaSeconds,
  pitch: orbit.pitch,
  distance: orbit.distance,
});

/**
 * 플레이어 위에 있는 카메라 주시점.
 *
 * 점프 높이를 그대로 따라간다. 고정해 두면 뛰었을 때 캐릭터가 화면 위로
 * 빠져나간다. 카메라 위치는 `dampVector` 가 이미 부드럽게 따라가므로 여기서
 * 따로 감쇠하지 않는다.
 */
export const resolveCameraFocus = (player: PlayerTransform): Vector3Like => ({
  x: player.x,
  y: SPACE_CAMERA_FOCUS_HEIGHT + player.y,
  z: player.z,
});

/**
 * 카메라를 월드 안으로 가둔다.
 *
 * 가두지 않으면 플레이어가 뒷벽 쪽에서 몸을 돌릴 때 카메라가 벽 뒤로 빠진다.
 * 벽은 단면 렌더라 뒤에서는 보이지 않고, 광장이 바깥에서 들여다보이는 상태가 된다.
 * 거리를 18 m 까지 늘릴 수 있게 되면서 이 구간이 훨씬 넓어졌다.
 *
 * 위를 보는 피치에서는 카메라가 주시점보다 낮아지므로 최저 높이도 함께 막는다.
 * 거리 18 m·피치 +5° 면 높이가 0.18 m 까지 내려간다.
 */
export const clampCameraPosition = (position: Vector3Like): Vector3Like => {
  const { boundaryMargin, minHeight } = SPACE_CAMERA;

  return {
    x: clamp(
      position.x,
      SPACE_CAMERA_BOUNDS.minX + boundaryMargin,
      SPACE_CAMERA_BOUNDS.maxX - boundaryMargin,
    ),
    // 바닥을 뚫지도, 천장을 뚫지도 않는다.
    y: clamp(position.y, minHeight, SPACE_CAMERA_BOUNDS.maxY),
    // 뒷벽 앞쪽으로만 둔다. 벽을 넘어가면 패널 뒷면을 보게 된다.
    z: clamp(position.z, SPACE_WALL_Z + boundaryMargin, SPACE_CAMERA_BOUNDS.maxZ - boundaryMargin),
  };
};

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

  return clampCameraPosition({
    x: focus.x - forwardX * orbit.distance,
    y: focus.y - forwardY * orbit.distance,
    z: focus.z - forwardZ * orbit.distance,
  });
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
