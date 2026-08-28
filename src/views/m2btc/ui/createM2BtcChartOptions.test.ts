import { describe, expect, it } from "vitest";
import { formatUsM2TooltipValue } from "./createM2BtcChartOptions";

describe("formatUsM2TooltipValue", () => {
  it("미발표 월의 null 값을 0달러로 표시하지 않는다", () => {
    expect(formatUsM2TooltipValue(null)).toBe("발표 전");
  });

  it("발표된 M2 값은 조 달러 단위로 표시한다", () => {
    expect(formatUsM2TooltipValue(22_123.45)).toBe("$22.12T");
  });
});
