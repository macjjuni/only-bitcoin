import { describe, expect, it } from "vitest";
import { squarifyTreemap } from "./squarifyTreemap";

const WIDTH = 400;
const HEIGHT = 300;

describe("squarifyTreemap", () => {
  it("칸 면적이 값에 비례하고 합이 전체 면적과 같다", () => {
    const values = [60, 10, 7, 4, 3, 16];
    const rects = squarifyTreemap(values, WIDTH, HEIGHT);
    const total = values.reduce((sum, value) => sum + value, 0);

    rects.forEach((rect, index) => {
      expect(rect.width * rect.height).toBeCloseTo((values[index] / total) * WIDTH * HEIGHT, 6);
    });
  });

  it("모든 칸이 영역 안에 있고 서로 겹치지 않는다", () => {
    const rects = squarifyTreemap([60, 10, 7, 4, 3, 16], WIDTH, HEIGHT);

    for (const rect of rects) {
      expect(rect.x).toBeGreaterThanOrEqual(-1e-9);
      expect(rect.y).toBeGreaterThanOrEqual(-1e-9);
      expect(rect.x + rect.width).toBeLessThanOrEqual(WIDTH + 1e-6);
      expect(rect.y + rect.height).toBeLessThanOrEqual(HEIGHT + 1e-6);
    }
    rects.forEach((a, aIndex) => {
      rects.slice(aIndex + 1).forEach((b) => {
        const overlapWidth = Math.min(a.x + a.width, b.x + b.width) - Math.max(a.x, b.x);
        const overlapHeight = Math.min(a.y + a.height, b.y + b.height) - Math.max(a.y, b.y);
        expect(overlapWidth > 1e-6 && overlapHeight > 1e-6).toBe(false);
      });
    });
  });

  it("입력 순서를 유지하고 0 이하 값은 크기 0 칸이 된다", () => {
    const rects = squarifyTreemap([1, 0, 3, -2], WIDTH, HEIGHT);
    expect(rects).toHaveLength(4);
    expect(rects[1].width * rects[1].height).toBe(0);
    expect(rects[3].width * rects[3].height).toBe(0);
    expect(rects[2].width * rects[2].height).toBeCloseTo(0.75 * WIDTH * HEIGHT, 6);
  });

  it("값이 하나면 전체를 채우고, 합이 0 이면 전부 빈 칸이다", () => {
    expect(squarifyTreemap([5], WIDTH, HEIGHT)).toEqual([
      { x: 0, y: 0, width: WIDTH, height: HEIGHT },
    ]);
    expect(squarifyTreemap([0, 0], WIDTH, HEIGHT).every((rect) => rect.width === 0)).toBe(true);
  });
});
