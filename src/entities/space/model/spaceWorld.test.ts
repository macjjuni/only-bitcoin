import { describe, expect, it } from "vitest";
import {
  SPACE_BILLBOARD,
  SPACE_BLOCK_DASHBOARD,
  SPACE_BOUNDS,
  SPACE_GROUND,
  SPACE_TEXT_BANNER,
  SPACE_WALL_ANCHOR,
  SPACE_WALL_PANEL_SPAN,
} from "@/entities/space";

const BILLBOARD_CENTER_Y = SPACE_WALL_ANCHOR[1];

/** 상대 오프셋을 월드 좌표로 되돌린다. */
const toWorldY = (offsetY: number): number => SPACE_WALL_ANCHOR[1] + offsetY;
const toWorldX = (offsetX: number): number => SPACE_WALL_ANCHOR[0] + offsetX;

describe("전광판·현황판 배치", () => {
  it("현황판은 전광판과 세로 중심이 같다", () => {
    expect(toWorldY(SPACE_BLOCK_DASHBOARD.offset[1])).toBeCloseTo(BILLBOARD_CENTER_Y, 6);
  });

  it("현황판은 전광판과 치수·프레임이 같다", () => {
    // 같은 벽에 나란히 걸리는 형제라 크기가 다르면 한쪽이 보조처럼 읽힌다.
    expect(SPACE_BLOCK_DASHBOARD.width).toBe(SPACE_BILLBOARD.width);
    expect(SPACE_BLOCK_DASHBOARD.height).toBe(SPACE_BILLBOARD.height);
    expect(SPACE_BLOCK_DASHBOARD.frameWidth).toBe(SPACE_BILLBOARD.frameWidth);
    expect(SPACE_BLOCK_DASHBOARD.frameHeight).toBe(SPACE_BILLBOARD.frameHeight);
    expect(SPACE_BLOCK_DASHBOARD.frameOffset).toEqual(SPACE_BILLBOARD.frameOffset);
  });

  it("현황판은 16:9 비율이다", () => {
    // 텍스처(1600 × 900)와 어긋나면 글자가 늘어난다.
    expect(SPACE_BLOCK_DASHBOARD.width / SPACE_BLOCK_DASHBOARD.height).toBeCloseTo(16 / 9, 6);
  });

  it("두 판이 중앙선을 기준으로 좌우 대칭이다", () => {
    const billboardX = toWorldX(SPACE_BILLBOARD.offset[0]);
    const dashboardX = toWorldX(SPACE_BLOCK_DASHBOARD.offset[0]);

    expect(billboardX).toBeLessThan(SPACE_WALL_ANCHOR[0]);
    expect(dashboardX).toBeGreaterThan(SPACE_WALL_ANCHOR[0]);
    expect(billboardX + dashboardX).toBeCloseTo(SPACE_WALL_ANCHOR[0] * 2, 6);
  });

  it("두 프레임이 겹치지 않고 간격을 둔다", () => {
    const billboardInnerEdge = toWorldX(SPACE_BILLBOARD.offset[0]) + SPACE_BILLBOARD.frameWidth / 2;
    const dashboardInnerEdge =
      toWorldX(SPACE_BLOCK_DASHBOARD.offset[0]) - SPACE_BLOCK_DASHBOARD.frameWidth / 2;

    expect(dashboardInnerEdge - billboardInnerEdge).toBeGreaterThanOrEqual(0.4);
  });

  it("두 프레임이 모두 바닥 폭 안에 들어온다", () => {
    const outerEdgeX =
      toWorldX(SPACE_BLOCK_DASHBOARD.offset[0]) + SPACE_BLOCK_DASHBOARD.frameWidth / 2;

    expect(outerEdgeX).toBeLessThan(SPACE_GROUND.width / 2);
    expect(SPACE_WALL_PANEL_SPAN).toBeCloseTo(outerEdgeX * 2, 6);
  });

  it("두 판 모두 기울이지 않는다", () => {
    // 기울이면 표시 면이 옆 패널·장비함에 가려 글자가 잘려 보인다.
    expect(SPACE_BLOCK_DASHBOARD.rotationY).toBe(0);
  });

  it("모든 패널이 바닥 위에 떠 있다", () => {
    const panels = [
      { y: BILLBOARD_CENTER_Y, height: SPACE_BILLBOARD.frameHeight },
      {
        y: toWorldY(SPACE_BLOCK_DASHBOARD.offset[1]),
        height: SPACE_BLOCK_DASHBOARD.frameHeight,
      },
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

  it("전광판 위에 얹히므로 전광판과 가로 중심이 같다", () => {
    // 중앙선에 두면 전광판에서 떨어져 공중에 뜬 것처럼 보인다.
    expect(SPACE_TEXT_BANNER.offset[0]).toBe(SPACE_BILLBOARD.offset[0]);
  });

  it("현황판 프레임과 세로로 겹치지 않는다", () => {
    const panelTop =
      toWorldY(SPACE_BLOCK_DASHBOARD.offset[1]) + SPACE_BLOCK_DASHBOARD.frameHeight / 2;

    expect(bannerBottom).toBeGreaterThanOrEqual(panelTop);
  });
});
