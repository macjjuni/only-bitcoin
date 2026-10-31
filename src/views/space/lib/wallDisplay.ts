import { SPACE_BILLBOARD, SPACE_WALL_ANCHOR } from "@/entities/space";
import { SPACE_CAMERA } from "@/features/space-controls";

/**
 * 좁은 화면에서 전광판 벽면을 줄이는 배율.
 *
 * three 의 원근 카메라는 **수직** FOV 를 고정하고 가로를 종횡비에서 유도한다.
 * 그래서 세로로 긴 폰에서는 가로 시야가 급격히 좁아진다. 세로 FOV 55° 기준으로
 * 데스크톱(종횡비 1.78)은 가로 85.6° 인데 아이폰 세로(0.46)는 27.0° 뿐이라,
 * 스폰 지점에서 전광판이 가시 폭의 111% 를 차지해 화면에 들어오지 않는다.
 *
 * FOV 를 넓히는 방법도 있지만 씬 전체가 어안처럼 왜곡되고 다른 오브젝트까지
 * 작아진다. 화면에서 차지하는 비율이 같아지므로 글자 크기 이득도 없다.
 * 벽면만 줄이면 원근은 그대로 두고 문제가 되는 축만 고칠 수 있다.
 */

/** 축소 기준 거리. 스폰 링 중심에서 전광판까지. */
const REFERENCE_VIEW_DISTANCE = Math.abs(SPACE_WALL_ANCHOR[2]);

/** 전광판 프레임이 차지해도 되는 가시 폭 비율. */
const TARGET_WIDTH_FRACTION = 0.8;

/** 지나치게 좁은 창에서 전광판이 점처럼 작아지지 않도록 막는다. */
const MIN_WALL_SCALE = 0.5;

const toRadians = (degrees: number): number => (degrees * Math.PI) / 180;

/**
 * 뷰포트 종횡비에 맞는 벽면 배율.
 *
 * 종횡비 0.68 이상(태블릿 세로·모든 가로 화면)에서는 1 이라 데스크톱 배치가
 * 그대로 유지된다. 그 아래에서만 줄어든다.
 */
export const resolveWallDisplayScale = (viewportAspect: number): number => {
  if (!Number.isFinite(viewportAspect) || viewportAspect <= 0) {
    return 1;
  }

  const visibleHeight = 2 * REFERENCE_VIEW_DISTANCE * Math.tan(toRadians(SPACE_CAMERA.fov) / 2);
  const visibleWidth = visibleHeight * viewportAspect;
  const fittedScale = (TARGET_WIDTH_FRACTION * visibleWidth) / SPACE_BILLBOARD.frameWidth;

  return Math.min(1, Math.max(MIN_WALL_SCALE, fittedScale));
};
