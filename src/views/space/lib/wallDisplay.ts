import { SPACE_BILLBOARD, SPACE_WALL_ANCHOR, SPACE_WALL_PANEL_SPAN } from "@/entities/space";
import { SPACE_CAMERA } from "@/features/space-controls";

/**
 * 좁은 화면에서 전광판 벽면을 줄이는 배율.
 *
 * three 의 원근 카메라는 **수직** FOV 를 고정하고 가로를 종횡비에서 유도한다.
 * 그래서 세로로 긴 화면에서는 가로 시야가 좁아진다. 세로 FOV 55° 기준으로
 * 데스크톱(종횡비 1.78)은 가로 85.6° 인데 아이폰 세로(0.46)는 27.0° 뿐이다.
 *
 * 손가락 기기는 18 m 뒤에서 시작한다. 중앙 스택에서 가장 넓은 전광판 프레임이
 * 화면을 넘지 않도록 실제 시작 거리로 배율을 구한다. 축소는 접는 폰 커버
 * 화면이나 좁게 줄인 데스크톱 창을 위한 안전장치다.
 *
 * FOV 를 넓히는 방법도 있지만 씬 전체가 어안처럼 왜곡되고 다른 오브젝트까지
 * 작아진다. 화면에서 차지하는 비율이 같아지므로 글자 크기 이득도 없다.
 * 벽면만 줄이면 원근은 그대로 두고 문제가 되는 축만 고칠 수 있다.
 */

/**
 * 중앙 스택이 차지해도 되는 가시 폭 비율.
 *
 * 크기를 정하는 값이 아니라 **넘침을 막는 가드**다. 작게 잡으면 화면이 좁을수록
 * 전광판을 필요 이상으로 줄이게 된다. 1 에 가깝게 두되 여백만 남긴다.
 */
const TARGET_WIDTH_FRACTION = 0.95;

/** 지나치게 좁은 창에서 전광판이 점처럼 작아지지 않도록 막는다. */
const MIN_WALL_SCALE = 0.5;

const toRadians = (degrees: number): number => (degrees * Math.PI) / 180;

/**
 * 뷰포트 종횡비에 맞는 벽면 배율.
 *
 * 일반적인 폰·태블릿·데스크톱에서는 1 이라 설계한 배치가 그대로 유지된다.
 * 그보다 좁은 화면에서만 줄어든다.
 */
export const resolveWallDisplayScale = (
  viewportAspect: number,
  cameraDistance: number = SPACE_CAMERA.defaultDistance,
): number => {
  if (!Number.isFinite(viewportAspect) || viewportAspect <= 0) {
    return 1;
  }

  // 화면에 보이는 폭을 정하는 건 플레이어가 아니라 카메라 위치다. 카메라는
  // 플레이어 뒤에 있으므로 벽까지의 거리에 카메라 거리를 더해야 한다.
  const safeCameraDistance = Number.isFinite(cameraDistance)
    ? cameraDistance
    : SPACE_CAMERA.defaultDistance;
  const referenceDistance =
    Math.abs(SPACE_WALL_ANCHOR[2]) + safeCameraDistance * Math.cos(SPACE_CAMERA.defaultPitch);
  const visibleHeight = 2 * referenceDistance * Math.tan(toRadians(SPACE_CAMERA.fov) / 2);
  const visibleWidth = visibleHeight * viewportAspect;
  // 전광판과 블록 현황판을 **함께** 맞춘다. 전광판 하나만 기준으로 삼으면
  // 세로로 긴 화면에서 현황판 바깥쪽이 잘린다. 두 판을 나란히 보여주는 것이
  // 이 배치의 목적이므로, 좁은 화면에서는 둘을 같이 줄이는 쪽이 맞다.
  const fittedScale = (TARGET_WIDTH_FRACTION * visibleWidth) / SPACE_WALL_PANEL_SPAN;

  return Math.min(1, Math.max(MIN_WALL_SCALE, fittedScale));
};

/**
 * 축소 배율에 맞춘 벽면 기준점 높이.
 *
 * 기준점을 그대로 두고 줄이면 패널이 중심을 향해 수축하면서 **아랫변이 떠오른다**.
 * 배율 0.68 에서 프레임 아랫변이 3.00 m → 3.96 m 로 1 m 올라가, 벽에 붙어 있던
 * 간판이 공중에 뜬 것처럼 보인다.
 *
 * 아랫변이 제자리에 남도록 기준점을 내린다. 실물 간판도 작게 만들면 설치 높이를
 * 유지하지 지붕 쪽으로 올리지 않는다.
 */
export const resolveWallAnchorY = (wallScale: number): number => {
  const baseAnchorY = SPACE_WALL_ANCHOR[1];

  if (!Number.isFinite(wallScale)) {
    return baseAnchorY;
  }

  return baseAnchorY - (1 - wallScale) * (SPACE_BILLBOARD.frameHeight / 2);
};
