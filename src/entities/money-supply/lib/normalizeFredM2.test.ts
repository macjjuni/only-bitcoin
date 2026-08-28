import { describe, expect, it } from "vitest";
import { normalizeFredM2Observations } from "./normalizeFredM2";

describe("normalizeFredM2Observations", () => {
  it("FRED 날짜와 문자열 값을 월 키와 숫자로 변환한다", () => {
    const observations = normalizeFredM2Observations([
      { date: "2026-06-01", value: "23115.2" },
      { date: "2026-07-01", value: "23218" },
    ]);

    expect(observations).toEqual([
      { monthKey: "2026-06", valueInBillionsUsd: 23115.2 },
      { monthKey: "2026-07", valueInBillionsUsd: 23218 },
    ]);
  });

  it("FRED 결측값과 유효하지 않은 관측값을 제외한다", () => {
    const observations = normalizeFredM2Observations([
      { date: "2026-06-01", value: "." },
      { date: "invalid-date", value: "23115.2" },
      { date: "2026-07-01", value: "not-a-number" },
      { date: "2026-08-01", value: "0" },
    ]);

    expect(observations).toEqual([]);
  });
});
