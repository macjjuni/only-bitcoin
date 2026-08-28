import { describe, expect, it } from "vitest";
import { createM2BtcChartOptions, formatUsM2TooltipValue } from "./createM2BtcChartOptions";

describe("formatUsM2TooltipValue", () => {
  it("미발표 월의 null 값을 0달러로 표시하지 않는다", () => {
    expect(formatUsM2TooltipValue(null)).toBe("발표 전");
  });

  it("발표된 M2 값은 조 달러 단위로 표시한다", () => {
    expect(formatUsM2TooltipValue(22_123.45)).toBe("$22.12T");
  });
});

describe("createM2BtcChartOptions", () => {
  it("비교 가능한 M2 값이 없으면 BTC 축만 표시한다", () => {
    const chartOptions = createM2BtcChartOptions({
      bitcoinLogAxisRange: { min: 0, max: 5 },
      isDark: false,
      usM2ValuesInBillionsUsd: [],
    });
    const yAxisOptions = chartOptions.yaxis;

    expect(Array.isArray(yAxisOptions)).toBe(true);
    expect(yAxisOptions).toHaveLength(1);
    expect(Array.isArray(yAxisOptions) ? yAxisOptions[0] : null).toMatchObject({
      seriesName: "BTC",
    });
  });

  it("M2 값이 있으면 BTC와 US M2 축을 모두 표시한다", () => {
    const chartOptions = createM2BtcChartOptions({
      bitcoinLogAxisRange: { min: 0, max: 5 },
      isDark: false,
      usM2ValuesInBillionsUsd: [23_000],
    });

    expect(chartOptions.yaxis).toHaveLength(2);
  });

  it("양쪽 Y축 레이블을 차트 바깥 방향으로 벌린다", () => {
    const chartOptions = createM2BtcChartOptions({
      bitcoinLogAxisRange: { min: 0, max: 5 },
      isDark: false,
      usM2ValuesInBillionsUsd: [23_000],
    });
    const yAxisOptions = chartOptions.yaxis;

    expect(Array.isArray(yAxisOptions) ? yAxisOptions[0]?.labels?.offsetX : null).toBe(-16);
    expect(Array.isArray(yAxisOptions) ? yAxisOptions[1]?.labels?.offsetX : null).toBe(-16);
  });
});
