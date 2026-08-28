import { describe, expect, it } from "vitest";
import { isCurrentBitcoinMonth } from "./isCurrentBitcoinMonth";

describe("isCurrentBitcoinMonth", () => {
  it("서버 렌더링 시점의 월과 같은 월 키를 진행 중으로 판단한다", () => {
    expect(isCurrentBitcoinMonth("2026-08", "2026-08")).toBe(true);
  });

  it("이미 완료된 월은 진행 중으로 판단하지 않는다", () => {
    expect(isCurrentBitcoinMonth("2026-07", "2026-08")).toBe(false);
  });
});
