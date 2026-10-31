import { describe, expect, it } from "vitest";
import {
  SPACE_AD_BOARDS,
  SPACE_BILLBOARD,
  SPACE_BOUNDS,
  SPACE_GROUND,
  SPACE_TEXT_BANNER,
  SPACE_WALL_ANCHOR,
} from "@/entities/space";

const BILLBOARD_CENTER_Y = SPACE_WALL_ANCHOR[1];

/** 상대 오프셋을 월드 좌표로 되돌린다. */
const toWorldY = (offsetY: number): number => SPACE_WALL_ANCHOR[1] + offsetY;
const toWorldX = (offsetX: number): number => SPACE_WALL_ANCHOR[0] + offsetX;

describe("전광판·광고판 배치", () => {
  it("광고판은 전광판과 세로 중심이 같다", () => {
    for (const adBoard of SPACE_AD_BOARDS) {
      expect(toWorldY(adBoard.offset[1])).toBeCloseTo(BILLBOARD_CENTER_Y, 6);
    }
  });

  it("광고판 윗변·아랫변이 전광판 안쪽에 들어온다", () => {
    const billboardTop = BILLBOARD_CENTER_Y + SPACE_BILLBOARD.height / 2;
    const billboardBottom = BILLBOARD_CENTER_Y - SPACE_BILLBOARD.height / 2;

    for (const adBoard of SPACE_AD_BOARDS) {
      const adTop = toWorldY(adBoard.offset[1]) + adBoard.height / 2;
      const adBottom = toWorldY(adBoard.offset[1]) - adBoard.height / 2;

      expect(adTop).toBeLessThanOrEqual(billboardTop);
      expect(adBottom).toBeGreaterThanOrEqual(billboardBottom);
    }
  });

  it("광고판은 3:2 비율이다", () => {
    for (const adBoard of SPACE_AD_BOARDS) {
      expect(adBoard.width / adBoard.height).toBeCloseTo(3 / 2, 6);
    }
  });

  it("광고판이 전광판 프레임과 겹치지 않는다", () => {
    const billboardHalfWidth = SPACE_BILLBOARD.frameWidth / 2;

    for (const adBoard of SPACE_AD_BOARDS) {
      // 안쪽으로 기울어 있어 가로 투영 폭이 실제 폭보다 좁다.
      const projectedHalfWidth = (adBoard.width * Math.cos(adBoard.rotationY)) / 2;
      const innerEdgeX = Math.abs(toWorldX(adBoard.offset[0])) - projectedHalfWidth;

      expect(innerEdgeX).toBeGreaterThan(billboardHalfWidth);
    }
  });

  it("모든 패널이 바닥 위에 떠 있다", () => {
    const panels = [
      { y: BILLBOARD_CENTER_Y, height: SPACE_BILLBOARD.frameHeight },
      ...SPACE_AD_BOARDS.map((adBoard) => ({
        y: toWorldY(adBoard.offset[1]),
        height: adBoard.height,
      })),
    ];

    for (const panel of panels) {
      expect(panel.y - panel.height / 2).toBeGreaterThan(0);
    }
  });

  it("뒷벽과 이동 경계가 바닥 안에 있다", () => {
    expect(SPACE_BOUNDS.minZ).toBeGreaterThan(SPACE_GROUND.centerZ - SPACE_GROUND.depth / 2);
    expect(SPACE_BOUNDS.maxZ).toBeLessThan(SPACE_GROUND.centerZ + SPACE_GROUND.depth / 2);
    expect(SPACE_BOUNDS.maxX).toBeLessThan(SPACE_GROUND.width / 2);
  });
});

describe("텍스트 배너 배치", () => {
  const bannerCenterY = toWorldY(SPACE_TEXT_BANNER.offset[1]);
  const bannerBottom = bannerCenterY - SPACE_TEXT_BANNER.height / 2;
  const billboardFrameTop = BILLBOARD_CENTER_Y + SPACE_BILLBOARD.frameHeight / 2;

  it("전광판 프레임 위에 놓인다", () => {
    expect(bannerBottom).toBeGreaterThan(billboardFrameTop);
  });

  it("전광판과 맞닿지 않고 간격을 둔다", () => {
    expect(bannerBottom - billboardFrameTop).toBeGreaterThanOrEqual(0.15);
  });

  it("전광판 패널과 폭이 같고 프레임 안쪽에 들어온다", () => {
    expect(SPACE_TEXT_BANNER.width).toBe(SPACE_BILLBOARD.width);
    expect(SPACE_TEXT_BANNER.width).toBeLessThan(SPACE_BILLBOARD.frameWidth);
  });

  it("가로가 세로보다 훨씬 길다", () => {
    expect(SPACE_TEXT_BANNER.width / SPACE_TEXT_BANNER.height).toBeGreaterThan(10);
  });

  it("좌우 중앙에 놓인다", () => {
    expect(toWorldX(SPACE_TEXT_BANNER.offset[0])).toBeCloseTo(SPACE_WALL_ANCHOR[0], 6);
  });

  it("광고판과 세로로 겹치지 않는다", () => {
    for (const adBoard of SPACE_AD_BOARDS) {
      const adTop = toWorldY(adBoard.offset[1]) + adBoard.height / 2;

      expect(bannerBottom).toBeGreaterThan(adTop);
    }
  });
});
