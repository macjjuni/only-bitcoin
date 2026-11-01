import { describe, expect, it } from "vitest";
import { resolveAdContactLabel, resolveSpaceWebSocketUrl } from "./space";

describe("resolveSpaceWebSocketUrl", () => {
  it("채팅 호스트를 유지하고 경로만 공간 엔드포인트로 바꾼다", () => {
    expect(resolveSpaceWebSocketUrl("wss://chat.example.com/v1/chat/ws")).toBe(
      "wss://chat.example.com/v1/space/ws",
    );
  });

  it("채팅 URL 이 없으면 빈 값을 준다", () => {
    expect(resolveSpaceWebSocketUrl("")).toBe("");
  });
});

describe("resolveAdContactLabel", () => {
  it("X 프로필에서 핸들만 뽑는다", () => {
    expect(resolveAdContactLabel("https://x.com/a7w2en7z_")).toBe("X @a7w2en7z_");
    expect(resolveAdContactLabel("https://twitter.com/foo")).toBe("X @foo");
  });

  it("프로필이 아닌 트윗 URL 에서도 핸들만 남긴다", () => {
    // 실제 피드백 URL 이 특정 트윗이다. 경로를 그대로 쓰면 배너가 깨진다.
    expect(resolveAdContactLabel("https://x.com/a7w2en7z_/status/1895109142622413102")).toBe(
      "X @a7w2en7z_",
    );
  });

  it("X 가 아닌 주소는 호스트만 쓴다", () => {
    expect(resolveAdContactLabel("https://example.com/contact/very/long/path")).toBe("example.com");
  });

  it("비거나 파싱이 안 되는 값은 빈 문자열이다", () => {
    // 호출부는 빈 문자열이면 연락처 줄을 그리지 않는다.
    for (const rawValue of ["", "   ", "not-a-url", "https://x.com/"]) {
      expect(resolveAdContactLabel(rawValue)).toBe("");
    }
  });
});
