import { afterEach, describe, expect, it, vi } from "vitest";
import { formatBlockElapsedTime } from "./formatBlockTime";

const blockTimestampInSeconds = 1_731_283_200;
const blockTimestampInMilliseconds = blockTimestampInSeconds * 1_000;

afterEach(() => {
  vi.useRealTimers();
});

describe("formatBlockElapsedTime", () => {
  it.each([
    [-1, "조금 전"],
    [0, "조금 전"],
    [59_999, "조금 전"],
    [60_000, "1분 전"],
    [3_599_999, "59분 전"],
    [3_600_000, "1시간 0분 전"],
    [3_660_000, "1시간 1분 전"],
    [86_400_000, "24시간 0분 전"],
  ])("블록 생성 후 %i ms를 %s로 표시한다", (elapsedMilliseconds, expectedLabel) => {
    expect(
      formatBlockElapsedTime(
        blockTimestampInSeconds,
        blockTimestampInMilliseconds + elapsedMilliseconds,
      ),
    ).toBe(expectedLabel);
  });

  it("클라이언트 시계가 준비되기 전에는 시간 경과와 무관하게 같은 대체 문구를 표시한다", () => {
    vi.useFakeTimers();
    const serverTimeInMilliseconds = blockTimestampInMilliseconds + 5 * 60_000;
    vi.setSystemTime(serverTimeInMilliseconds);
    expect(formatBlockElapsedTime(blockTimestampInSeconds, null)).toBe("-");

    vi.setSystemTime(serverTimeInMilliseconds + 10 * 60_000);
    expect(formatBlockElapsedTime(blockTimestampInSeconds, null)).toBe("-");
    expect(formatBlockElapsedTime(blockTimestampInSeconds, Date.now())).toBe("15분 전");
  });

  it.each([undefined, 0, Number.NaN])("블록 시각이 %s이면 대체 문구를 표시한다", (timestamp) => {
    expect(formatBlockElapsedTime(timestamp, blockTimestampInMilliseconds)).toBe("-");
  });
});
