import { describe, expect, it } from "vitest";
import { SPACE_BILLBOARD, SPACE_WALL_ANCHOR } from "@/entities/space";
import { SPACE_CAMERA } from "@/features/space-controls";
import { resolveWallAnchorY, resolveWallDisplayScale } from "@/views/space/lib/wallDisplay";

const DESKTOP_ASPECT = 1920 / 1080;
const LAPTOP_ASPECT = 1440 / 900;
const TABLET_PORTRAIT_ASPECT = 820 / 1180;
const PHONE_PORTRAIT_ASPECT = 393 / 852;
const PHONE_LANDSCAPE_ASPECT = 852 / 393;

/**
 * 기준 거리에서 화면에 보이는 월드 가로 폭.
 *
 * 카메라는 플레이어 뒤에 있으므로 벽까지의 거리에 카메라 거리를 더해야 한다.
 */
const resolveVisibleWidth = (
  viewportAspect: number,
  cameraDistance: number = SPACE_CAMERA.defaultDistance,
): number => {
  const distance =
    Math.abs(SPACE_WALL_ANCHOR[2]) + cameraDistance * Math.cos(SPACE_CAMERA.defaultPitch);
  const visibleHeight = 2 * distance * Math.tan(((SPACE_CAMERA.fov / 2) * Math.PI) / 180);

  return visibleHeight * viewportAspect;
};

describe("resolveWallDisplayScale", () => {
  it("가로 화면에서는 줄이지 않는다", () => {
    expect(resolveWallDisplayScale(DESKTOP_ASPECT)).toBe(1);
    expect(resolveWallDisplayScale(LAPTOP_ASPECT)).toBe(1);
    expect(resolveWallDisplayScale(PHONE_LANDSCAPE_ASPECT)).toBe(1);
  });

  it("태블릿 세로는 이미 들어오므로 줄이지 않는다", () => {
    expect(resolveWallDisplayScale(TABLET_PORTRAIT_ASPECT)).toBe(1);
  });

  it("일반적인 폰 세로는 기본 카메라 거리에서 이미 들어오므로 줄이지 않는다", () => {
    for (const aspect of [PHONE_PORTRAIT_ASPECT, 360 / 780, 412 / 915]) {
      expect(resolveWallDisplayScale(aspect)).toBe(1);
    }
  });

  it("그보다 좁은 화면에서만 줄인다", () => {
    // 접는 폰 커버 화면이나 좁게 줄인 데스크톱 창.
    expect(resolveWallDisplayScale(320 / 900)).toBeLessThan(1);
  });

  it("어떤 종횡비·카메라 거리에서도 전광판이 가시 폭 안에 들어온다", () => {
    const aspects = [0.25, 0.3, 320 / 900, PHONE_PORTRAIT_ASPECT, 360 / 780, 0.7, 1.78];
    const distances = [SPACE_CAMERA.touchInitialDistance, SPACE_CAMERA.defaultDistance];

    for (const aspect of aspects) {
      for (const distance of distances) {
        const scaledFrameWidth =
          SPACE_BILLBOARD.frameWidth * resolveWallDisplayScale(aspect, distance);

        expect(scaledFrameWidth).toBeLessThanOrEqual(resolveVisibleWidth(aspect, distance));
      }
    }
  });

  it("종횡비가 커질수록 배율도 커진다", () => {
    const narrow = resolveWallDisplayScale(0.25);
    const wide = resolveWallDisplayScale(0.35);

    expect(wide).toBeGreaterThan(narrow);
  });

  it("카메라가 가까울수록 더 줄인다", () => {
    // 가까이 붙을수록 벽면이 화면을 더 많이 차지하므로 가드가 일찍 걸린다.
    const atDefault = resolveWallDisplayScale(0.3, SPACE_CAMERA.defaultDistance);
    const atTouchStart = resolveWallDisplayScale(0.3, SPACE_CAMERA.touchInitialDistance);

    expect(atTouchStart).toBeLessThan(atDefault);
  });

  it("손가락 기기 시작 거리에서도 일반적인 폰은 사실상 줄이지 않는다", () => {
    // 가장 가까이 붙여 시작하므로 가드 경계에 바짝 붙는다. 0.1% 미만의 차이는
    // 화면에서 구분되지 않지만, 경계를 넘지 않는다는 사실 자체가 중요하다.
    for (const aspect of [PHONE_PORTRAIT_ASPECT, 360 / 780, 412 / 915]) {
      expect(resolveWallDisplayScale(aspect, SPACE_CAMERA.touchInitialDistance)).toBeGreaterThan(
        0.99,
      );
    }
  });

  it("카메라 거리를 읽지 못하면 기본 거리로 계산한다", () => {
    expect(resolveWallDisplayScale(0.3, Number.NaN)).toBe(
      resolveWallDisplayScale(0.3, SPACE_CAMERA.defaultDistance),
    );
  });

  it("아무리 좁아도 하한 아래로 내려가지 않는다", () => {
    expect(resolveWallDisplayScale(0.01)).toBe(0.5);
  });

  it("종횡비를 읽지 못하면 줄이지 않는다", () => {
    expect(resolveWallDisplayScale(0)).toBe(1);
    expect(resolveWallDisplayScale(Number.NaN)).toBe(1);
    expect(resolveWallDisplayScale(-1)).toBe(1);
  });
});

describe("resolveWallAnchorY", () => {
  /** 주어진 배율에서 프레임 아랫변의 월드 높이. */
  const resolveFrameBottom = (wallScale: number): number => {
    return resolveWallAnchorY(wallScale) - (SPACE_BILLBOARD.frameHeight * wallScale) / 2;
  };

  const DESKTOP_FRAME_BOTTOM = resolveFrameBottom(1);

  it("배율 1 이면 기준점을 그대로 둔다", () => {
    expect(resolveWallAnchorY(1)).toBe(SPACE_WALL_ANCHOR[1]);
  });

  it("줄여도 프레임 아랫변이 제자리에 있다", () => {
    for (const wallScale of [0.5, 0.68, 0.8, 1]) {
      expect(resolveFrameBottom(wallScale)).toBeCloseTo(DESKTOP_FRAME_BOTTOM, 6);
    }
  });

  it("줄이면 기준점이 내려간다", () => {
    expect(resolveWallAnchorY(0.68)).toBeLessThan(SPACE_WALL_ANCHOR[1]);
  });

  it("줄여도 패널이 바닥 아래로 내려가지 않는다", () => {
    expect(resolveFrameBottom(0.5)).toBeGreaterThan(0);
  });

  it("배율을 읽지 못하면 기준점을 그대로 둔다", () => {
    expect(resolveWallAnchorY(Number.NaN)).toBe(SPACE_WALL_ANCHOR[1]);
  });
});
