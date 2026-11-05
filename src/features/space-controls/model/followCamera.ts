import { type PlayerTransform, SPACE_CAMERA_BOUNDS } from "@/entities/space";

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
   * 세로로 긴 화면은 세로 시야가 넓고 가로가 좁다. 광장에서 가까이 붙으면
   * 궁전이 화면 위로 잘려 "여기가 어디인지" 가 안 보인다. 물러나면 궁전과
   * 양옆 전광판이 한 화면에 들어온다. 시작값일 뿐이라 핀치로 다가갈 수 있다.
   */
  touchInitialDistance: 18,
  /**
   * 손가락 기기에서 화면을 아래로 미는 비율(화면 높이 대비).
   *
   * 세로 화면은 아바타가 한가운데 서면 위쪽 전광판이 잘리고 엄지·조이스틱이
   * 아바타를 가림. 렌즈만 위로 옮겨(view offset) 아바타를 아래로 내림. 궤도·
   * 시점 각도는 그대로라 조작감이 바뀌지 않음.
   */
  touchFramingShift: 0.07,
  /**
   * 데스크톱에서 화면을 아래로 미는 비율. 가로 화면이라 손가락 기기보다 살짝만 내림.
   *
   * 고개 들기로 전광판을 볼 수 있게 되면서 12%·6% 에서 7%·3% 로 줄였음. 많이 내리면
   * 캐릭터가 화면 아래에 붙어 어색했음.
   */
  desktopFramingShift: 0.03,
  /** 휠 deltaY 1 단위당 거리 변화(m). 한 노치(100)에 약 1.2 m. */
  wheelZoomSensitivity: 0.012,
  /** 핀치 1 px 당 거리 변화(m). 200 px 벌리면 약 6 m. */
  pinchZoomSensitivity: 0.03,
  defaultPitch: toRadians(-12),
  minPitch: toRadians(-35),
  /**
   * 위로 올려다볼 수 있는 한계. 전광판(높이 7~17 m)을 정면으로 보려면 많이 들어야 함.
   *
   * `orbitMaxPitch` 를 넘는 몫은 카메라를 내리지 않고 시선만 듦. 그래서 크게
   * 열어도 카메라가 바닥에 닿지 않음. 25° 는 천장이 화면을 덮어서 전광판이
   * 화면 가운데 오는 12° 로 잡았음.
   */
  maxPitch: toRadians(12),
  /**
   * 카메라가 궤도를 따라 내려가는 마지막 각도.
   *
   * 이보다 위를 보면 카메라 높이는 멈추고 시선만 위로 듦(고개 들기). 궤도대로
   * 계속 내려가면 라운지 둘레 소파·턱에 걸려 카메라가 앞으로 당겨지면서 확대돼
   * 보였음.
   */
  orbitMaxPitch: toRadians(-5),
  /** 드래그 1 px 당 yaw 회전량(라디안). */
  dragSensitivity: toRadians(0.25),
  /** 키보드 전용 시야 회전 속도(라디안/초). */
  keyboardYawRate: toRadians(90),
  followDamping: 8,
  /** 모션 축소 환경에서는 감쇠를 올려 흔들림을 줄인다. */
  reducedMotionFollowDamping: 20,
  fov: 55,
  /**
   * 카메라가 바다 아래로 내려가지 않는 최저 높이.
   *
   * 섬은 바다가 y = 0 이고 선착장이 0.5 다. 선착장에서 올려다볼 때 카메라가
   * 수면 아래로 내려가면 화면이 바다 평면에 덮인다.
   */
  minHeight: 0.6,
  /**
   * 지형·경계에서 띄울 여유.
   *
   * 지형 충돌에서는 벽에 닿은 지점보다 이만큼 앞에 카메라를 세운다. 0 으로
   * 두면 근평면(0.1)이 벽을 파고들어 벽 너머가 비친다.
   */
  boundaryMargin: 0.4,
  /**
   * 지형에 막혔다 풀릴 때 거리를 되돌리는 감쇠 계수.
   *
   * 당기는 쪽은 감쇠하지 않는다 — 한 프레임이라도 늦으면 벽 너머가 비친다.
   * 푸는 쪽만 늦춘다. 광장은 화분·벚나무·기둥이 촘촘해서 그 옆을 지날 때마다
   * 카메라가 즉시 들어왔다 즉시 나가는데, 그 **튕김이 멀미를 만든다.**
   *
   * 8 이면 0.12 초, 4 면 0.25 초쯤 걸려 제자리로 간다. 너무 낮추면 소품을
   * 지나친 뒤에도 카메라가 한참 가까이 붙어 있어 답답하다.
   */
  collisionReleaseDamping: 6,
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
 * 카메라를 월드 상자 안으로 가둔다.
 *
 * 섬은 사방이 바다라 벙커처럼 "벽 뒤로 빠지는" 문제가 없다. 이 상자는 지형을
 * 파고드는 것을 막지 않고 — 그쪽은 `IslandTerrain.resolveCameraPosition` 이
 * 레이캐스트로 한다 — 카메라가 섬에서 한없이 멀어지거나 수면 아래로 내려가는
 * 것만 막는다.
 *
 * 위를 보는 피치에서는 카메라가 주시점보다 낮아지므로 최저 높이도 함께 막는다.
 * 거리 18 m·피치 +5° 면 높이가 0.18 m 까지 내려간다.
 */
export const clampCameraPosition = (position: Vector3Like): Vector3Like => {
  const { minHeight } = SPACE_CAMERA;

  return {
    x: clamp(position.x, SPACE_CAMERA_BOUNDS.minX, SPACE_CAMERA_BOUNDS.maxX),
    // 수면 아래로 내려가지도, 궁전 꼭대기보다 높이 뜨지도 않는다.
    y: clamp(position.y, minHeight, SPACE_CAMERA_BOUNDS.maxY),
    z: clamp(position.z, SPACE_CAMERA_BOUNDS.minZ, SPACE_CAMERA_BOUNDS.maxZ),
  };
};

/** 카메라 위치를 정하는 각도. 고개 들기 몫을 뺀 값임. */
export const resolveOrbitPitch = (pitch: number): number => {
  return Math.min(pitch, SPACE_CAMERA.orbitMaxPitch);
};

/** 궤도 한계를 넘어 고개만 든 각도. 한계 아래면 0. */
export const resolveLookUpPitch = (pitch: number): number => {
  return Math.max(0, pitch - SPACE_CAMERA.orbitMaxPitch);
};

/** 시선이 수직에 가까워지면 화면이 뒤집히므로 올려다보는 각도를 여기서 막음. */
const MAX_LOOK_ELEVATION = toRadians(80);

/**
 * 카메라가 실제로 바라볼 지점.
 *
 * 고개를 안 들었으면 주시점(머리) 그대로라 지금까지와 같음. 고개를 들면 카메라
 * 자리는 두고, 카메라에서 본 주시점의 올려본 각도에 그 몫을 더한 방향으로 시선을
 * 옮김. 주시점과 같은 수평 거리 위에서 높이만 올리므로 좌우는 흔들리지 않음.
 *
 * @param cameraPosition 충돌·감쇠를 거친 실제 카메라 위치
 */
export const resolveCameraLookTarget = (
  focus: Vector3Like,
  cameraPosition: Vector3Like,
  pitch: number,
): Vector3Like => {
  const lookUpPitch = resolveLookUpPitch(pitch);

  if (lookUpPitch <= 0) {
    return focus;
  }

  const horizontalDistance = Math.hypot(focus.x - cameraPosition.x, focus.z - cameraPosition.z);

  // 카메라가 주시점 바로 위·아래면 방향을 정할 수 없어 그대로 둠.
  if (horizontalDistance < 1e-6) {
    return focus;
  }

  const focusElevation = Math.atan2(focus.y - cameraPosition.y, horizontalDistance);
  const lookElevation = Math.min(focusElevation + lookUpPitch, MAX_LOOK_ELEVATION);

  return {
    x: focus.x,
    y: cameraPosition.y + horizontalDistance * Math.tan(lookElevation),
    z: focus.z,
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
  // 고개 드는 몫은 위치에 넣지 않음. 카메라는 `orbitMaxPitch` 높이에서 멈춤.
  const orbitPitch = resolveOrbitPitch(orbit.pitch);
  const cosPitch = Math.cos(orbitPitch);
  const forwardX = -Math.sin(orbit.yaw) * cosPitch;
  const forwardY = Math.sin(orbitPitch);
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

/**
 * 지형이 허용하는 카메라 거리 상한을 **비대칭**으로 따라간다.
 *
 * 상한이 줄면(벽에 가까워지면) 그 값을 즉시 받아들이고, 늘면(벽에서 멀어지면)
 * 감쇠하며 천천히 되돌린다. 양쪽 다 즉시면 소품 옆을 지날 때 카메라가 툭툭
 * 튀고, 양쪽 다 감쇠하면 벽에 붙는 순간 한 프레임 동안 벽 안이 보인다.
 */
export const approachCollisionDistance = (
  current: number,
  target: number,
  deltaSeconds: number,
): number => {
  if (target <= current) {
    return target;
  }

  return (
    current +
    (target - current) * resolveDampFactor(SPACE_CAMERA.collisionReleaseDamping, deltaSeconds)
  );
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
