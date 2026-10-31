import { describe, expect, it } from "vitest";
import {
  BILLBOARD_COLORS,
  BILLBOARD_PLACEHOLDER,
  formatBillboardChange,
  formatBillboardKrw,
  formatBillboardUsd,
  resolveChangeTone,
  resolveToneColor,
} from "@/views/space/lib/billboardTexture";

describe("formatBillboardKrw", () => {
  it("천 단위를 끊어 원화 기호와 함께 보여준다", () => {
    expect(formatBillboardKrw(158_420_000)).toBe("₩158,420,000");
  });

  it("소수점은 버린다", () => {
    expect(formatBillboardKrw(158_420_000.7)).toBe("₩158,420,001");
  });

  it("스토어 초기값 0 과 비정상 값은 자리표시로 바꾼다", () => {
    expect(formatBillboardKrw(0)).toBe(BILLBOARD_PLACEHOLDER);
    expect(formatBillboardKrw(-1)).toBe(BILLBOARD_PLACEHOLDER);
    expect(formatBillboardKrw(Number.NaN)).toBe(BILLBOARD_PLACEHOLDER);
    expect(formatBillboardKrw(Number.POSITIVE_INFINITY)).toBe(BILLBOARD_PLACEHOLDER);
  });
});

describe("formatBillboardUsd", () => {
  it("달러는 정수로 끊어 보여준다", () => {
    expect(formatBillboardUsd(108_432.5)).toBe("$108,433");
  });

  it("값이 없으면 자리표시다", () => {
    expect(formatBillboardUsd(0)).toBe(BILLBOARD_PLACEHOLDER);
  });
});

describe("formatBillboardChange", () => {
  it("상승은 부호를 붙이고 소수 두 자리로 고정한다", () => {
    expect(formatBillboardChange("2.4")).toBe("+2.40%");
    expect(formatBillboardChange(2.415)).toBe("+2.42%");
  });

  it("하락은 음수 부호를 유지한다", () => {
    expect(formatBillboardChange("-1.2")).toBe("-1.20%");
  });

  it("보합은 부호를 붙이지 않는다", () => {
    expect(formatBillboardChange("0")).toBe("0.00%");
  });

  it("해석할 수 없는 값은 자리표시다", () => {
    expect(formatBillboardChange("")).toBe(BILLBOARD_PLACEHOLDER);
    expect(formatBillboardChange("n/a")).toBe(BILLBOARD_PLACEHOLDER);
  });
});

describe("resolveChangeTone", () => {
  it("부호에 따라 톤을 가른다", () => {
    expect(resolveChangeTone("2.4")).toBe("up");
    expect(resolveChangeTone("-2.4")).toBe("down");
    expect(resolveChangeTone("0")).toBe("flat");
  });

  it("해석 불가는 보합으로 본다", () => {
    expect(resolveChangeTone("n/a")).toBe("flat");
  });

  it("톤 색은 프로젝트 팔레트를 따른다", () => {
    expect(resolveToneColor("up")).toBe(BILLBOARD_COLORS.up);
    expect(resolveToneColor("down")).toBe(BILLBOARD_COLORS.down);
    expect(resolveToneColor("flat")).toBe(BILLBOARD_COLORS.flat);
  });
});
