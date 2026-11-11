import { describe, expect, it } from "vitest";
import { CHANGE_COLOR_STOPS, resolveNeutralTileFill, resolveTileColor } from "./resolveTileColor";

describe("resolveTileColor", () => {
  it("스테이블·기타·등락 없음은 중립색", () => {
    const neutralFill = resolveNeutralTileFill(false);
    expect(resolveTileColor({ kind: "stablecoin", dailyChangePercent: 3 }, false).fill).toBe(
      neutralFill,
    );
    expect(resolveTileColor({ kind: "others", dailyChangePercent: null }, false).fill).toBe(
      neutralFill,
    );
    expect(resolveTileColor({ kind: "coin", dailyChangePercent: 0 }, false).fill).toBe(neutralFill);
  });

  it("10% 이상은 상승·하락 원색에 흰 글자", () => {
    expect(resolveTileColor({ kind: "coin", dailyChangePercent: 12 }, false)).toEqual({
      fill: CHANGE_COLOR_STOPS.up,
      text: "#FFFFFF",
    });
    expect(resolveTileColor({ kind: "bitcoin", dailyChangePercent: -15 }, true)).toEqual({
      fill: CHANGE_COLOR_STOPS.down,
      text: "#FFFFFF",
    });
  });

  it("작은 등락은 옅은 색에 테마 글자색", () => {
    const color = resolveTileColor({ kind: "coin", dailyChangePercent: -0.3 }, false);
    expect(color.fill).not.toBe(CHANGE_COLOR_STOPS.down);
    expect(color.fill).not.toBe(resolveNeutralTileFill(false));
    expect(color.text).toBe("#27272A");
  });

  it("단계 경계가 올라갈수록 진해진다", () => {
    const fills = [0.4, 1, 3, 7, 20].map(
      (percent) => resolveTileColor({ kind: "coin", dailyChangePercent: percent }, false).fill,
    );
    expect(new Set(fills).size).toBe(5);
  });
});
