import { describe, expect, it } from "vitest";
import { calculateReconnectDelayInMilliseconds } from "./reconnectBackoff";

describe("calculateReconnectDelayInMilliseconds", () => {
  it("지수 상한과 full jitter를 적용한다", () => {
    expect(calculateReconnectDelayInMilliseconds(0, 0.5)).toBe(500);
    expect(calculateReconnectDelayInMilliseconds(3, 0.5)).toBe(4_000);
    expect(calculateReconnectDelayInMilliseconds(99, 1)).toBe(30_000);
  });
});
