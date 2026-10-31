import { describe, expect, it } from "vitest";
import { SPACE_BILLBOARD, SPACE_WALL_ANCHOR } from "@/entities/space";
import { SPACE_CAMERA } from "@/features/space-controls";
import { resolveWallAnchorY, resolveWallDisplayScale } from "@/views/space/lib/wallDisplay";

const DESKTOP_ASPECT = 1920 / 1080;
const LAPTOP_ASPECT = 1440 / 900;
const TABLET_PORTRAIT_ASPECT = 820 / 1180;
const PHONE_PORTRAIT_ASPECT = 393 / 852;
const PHONE_LANDSCAPE_ASPECT = 852 / 393;

/** 기준 거리에서 화면에 보이는 월드 가로 폭. */
const resolveVisibleWidth = (viewportAspect: number): number => {
  const distance = Math.abs(SPACE_WALL_ANCHOR[2]);
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

  it("폰 세로에서는 줄인다", () => {
    expect(resolveWallDisplayScale(PHONE_PORTRAIT_ASPECT)).toBeLessThan(1);
  });

  it("줄인 뒤에는 전광판이 가시 폭 안에 들어온다", () => {
    for (const aspect of [PHONE_PORTRAIT_ASPECT, 360 / 780, 320 / 900]) {
      const scaledFrameWidth = SPACE_BILLBOARD.frameWidth * resolveWallDisplayScale(aspect);

      expect(scaledFrameWidth).toBeLessThanOrEqual(resolveVisibleWidth(aspect));
    }
  });

  it("종횡비가 커질수록 배율도 커진다", () => {
    const narrow = resolveWallDisplayScale(0.4);
    const wide = resolveWallDisplayScale(0.6);

    expect(wide).toBeGreaterThan(narrow);
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
