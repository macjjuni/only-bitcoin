import { describe, expect, it } from "vitest";
import { formatChatDateKey, formatChatDateLabel, shouldRenderChatDateSeparator } from "./chatDate";

describe("chatDate", () => {
  it("타임스탬프를 한국 날짜로 표시한다", () => {
    const timestampInMilliseconds = Date.parse("2026-09-04T15:00:00.000Z");

    expect(formatChatDateKey(timestampInMilliseconds)).toBe("2026-09-05");
    expect(formatChatDateLabel(timestampInMilliseconds)).toBe("2026년 9월 5일 토요일");
  });

  it("첫 메시지에는 날짜 구분선을 표시한다", () => {
    const timestampInMilliseconds = Date.parse("2026-09-05T03:00:00.000Z");

    expect(shouldRenderChatDateSeparator(timestampInMilliseconds)).toBe(true);
  });

  it("한국 시간으로 같은 날짜인 연속 메시지에는 구분선을 표시하지 않는다", () => {
    const previousTimestampInMilliseconds = Date.parse("2026-09-04T15:00:00.000Z");
    const timestampInMilliseconds = Date.parse("2026-09-05T14:59:59.999Z");

    expect(
      shouldRenderChatDateSeparator(timestampInMilliseconds, previousTimestampInMilliseconds),
    ).toBe(false);
  });

  it("한국 시간으로 날짜가 바뀐 연속 메시지에는 구분선을 표시한다", () => {
    const previousTimestampInMilliseconds = Date.parse("2026-09-05T14:59:59.999Z");
    const timestampInMilliseconds = Date.parse("2026-09-05T15:00:00.000Z");

    expect(
      shouldRenderChatDateSeparator(timestampInMilliseconds, previousTimestampInMilliseconds),
    ).toBe(true);
  });
});
