import { describe, expect, it } from "vitest";
import { resolveSpacePresenceUrl, resolveSpaceWebSocketUrl } from "./space";

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

describe("resolveSpacePresenceUrl", () => {
  it("같은 호스트의 HTTP 인원수 주소로 바꾼다", () => {
    expect(resolveSpacePresenceUrl("wss://chat.example.com/v1/chat/ws?token=old")).toBe(
      "https://chat.example.com/v1/space/presence",
    );
    expect(resolveSpacePresenceUrl("ws://localhost:8787/v1/space/ws")).toBe(
      "http://localhost:8787/v1/space/presence",
    );
  });

  it("채팅 URL 이 없으면 빈 값을 준다", () => {
    expect(resolveSpacePresenceUrl("")).toBe("");
  });
});
