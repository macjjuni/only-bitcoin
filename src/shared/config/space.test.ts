import { describe, expect, it } from "vitest";
import { resolveSpaceWebSocketUrl } from "./space";

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
