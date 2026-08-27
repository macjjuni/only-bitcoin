import { describe, expect, it } from "vitest";
import {
  formatEtfAumInUsd,
  formatEtfChartDate,
  formatEtfChartDateWithYear,
  formatEtfDate,
  formatEtfHoldingsInBtc,
  formatSignedEtfFlowInUsd,
} from "./formatEtf";

describe("formatSignedEtfFlowInUsd", () => {
  it("유입과 유출 방향을 포함해 달러 금액을 축약한다", () => {
    expect(formatSignedEtfFlowInUsd(1_250_000_000)).toBe("+$1.25B");
    expect(formatSignedEtfFlowInUsd(-82_500_000)).toBe("−$82.5M");
    expect(formatSignedEtfFlowInUsd(0)).toBe("$0");
  });
});

describe("formatEtfAumInUsd", () => {
  it("AUM을 부호 없이 축약한다", () => {
    expect(formatEtfAumInUsd(60_812_000_000)).toBe("$60.81B");
    expect(formatEtfAumInUsd(null)).toBe("-");
  });
});

describe("formatEtfHoldingsInBtc", () => {
  it("BTC 보유량을 최대 소수 둘째 자리까지 표시한다", () => {
    expect(formatEtfHoldingsInBtc(37_947.9409)).toBe("37,947.94 BTC");
  });
});

describe("ETF 날짜 포맷", () => {
  it("기준일과 차트 축 날짜를 각각 표시한다", () => {
    expect(formatEtfDate("2026-08-21")).toBe("2026.08.21");
    expect(formatEtfChartDate("2026-08-21")).toBe("8/21");
    expect(formatEtfChartDateWithYear("2026-08-21")).toBe("26.08.21");
  });
});
