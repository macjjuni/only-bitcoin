import { describe, expect, it } from "vitest";
import { getSpaceIpConnectionLimit } from "./spaceConnectionLimit";

describe("getSpaceIpConnectionLimit", () => {
  it("운영 호스트는 개발 설정이 켜져 있어도 IP당 한 연결만 허용한다", () => {
    expect(getSpaceIpConnectionLimit(new URL("https://worker.test/v1/space/ws"), true)).toBe(1);
  });

  it("로컬 호스트와 개발 설정이 함께 있을 때만 제한을 해제한다", () => {
    expect(getSpaceIpConnectionLimit(new URL("http://localhost:8787/v1/space/ws"), true)).toBe(
      Number.POSITIVE_INFINITY,
    );
    expect(getSpaceIpConnectionLimit(new URL("http://127.0.0.1:8787/v1/space/ws"), true)).toBe(
      Number.POSITIVE_INFINITY,
    );
    expect(getSpaceIpConnectionLimit(new URL("http://localhost:8787/v1/space/ws"), false)).toBe(1);
  });
});
