import { describe, expect, it } from "vitest";
import { SPACE_BILLBOARD, SPACE_WALL_ANCHOR, SPACE_WALL_PANEL_SPAN } from "@/entities/space";
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

  it("태블릿 세로는 거의 그대로 둔다", () => {
    expect(resolveWallDisplayScale(TABLET_PORTRAIT_ASPECT)).toBeGreaterThan(0.9);
  });

  it("폰 세로는 두 판을 함께 담으려고 줄인다", () => {
    // 전광판 하나만 기준으로 삼으면 1 이지만, 좌우 두 판을 다 보여주는 것이
    // 이 배치의 목적이라 세로로 긴 화면에서는 같이 줄인다.
    for (const aspect of [PHONE_PORTRAIT_ASPECT, 360 / 780, 412 / 915]) {
      const scale = resolveWallDisplayScale(aspect, SPACE_CAMERA.touchInitialDistance);

      expect(scale).toBeLessThan(1);
      expect(scale).toBeGreaterThan(0.7);
    }
  });

  it("줄일 때는 두 판을 합친 폭이 가시 폭의 95% 에 맞는다", () => {
    const aspect = PHONE_PORTRAIT_ASPECT;
    const distance = SPACE_CAMERA.touchInitialDistance;
    const scale = resolveWallDisplayScale(aspect, distance);

    expect(SPACE_WALL_PANEL_SPAN * scale).toBeCloseTo(
      resolveVisibleWidth(aspect, distance) * 0.95,
      6,
    );
  });

  it("어떤 종횡비·카메라 거리에서도 전광판 프레임은 가시 폭 안에 들어온다", () => {
    // 하한(0.5)에 걸리면 두 판을 합친 폭은 넘칠 수 있다. 그래도 가격을 보여주는
    // 전광판 자체는 잘리지 않아야 한다.
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
    const narrow = resolveWallDisplayScale(0.45);
    const wide = resolveWallDisplayScale(0.6);

    expect(wide).toBeGreaterThan(narrow);
  });

  it("카메라가 가까울수록 더 줄인다", () => {
    // 가까이 붙을수록 벽면이 화면을 더 많이 차지하므로 가드가 일찍 걸린다.
    // 0.3 은 두 판 기준에서 이미 하한에 닿으므로 조금 넓은 종횡비로 본다.
    const atNear = resolveWallDisplayScale(0.6, SPACE_CAMERA.minDistance);
    const atFar = resolveWallDisplayScale(0.6, SPACE_CAMERA.maxDistance);

    expect(atNear).toBeLessThan(atFar);
  });

  it("손가락 기기는 멀리서 시작하므로 기본 거리보다 덜 줄인다", () => {
    for (const aspect of [PHONE_PORTRAIT_ASPECT, 360 / 780, 412 / 915]) {
      const atTouchStart = resolveWallDisplayScale(aspect, SPACE_CAMERA.touchInitialDistance);
      const atDefault = resolveWallDisplayScale(aspect, SPACE_CAMERA.defaultDistance);

      expect(atTouchStart).toBeGreaterThan(atDefault);
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
