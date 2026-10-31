import { describe, expect, it } from "vitest";
import { resolveSpaceAdEnabled, resolveSpaceWebSocketUrl } from "./space";

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

describe("resolveSpaceAdEnabled", () => {
  it("값을 넣지 않으면 광고를 노출한다", () => {
    // 변수를 빼먹은 배포에서 광고가 조용히 사라지면 원인을 찾기 어렵다.
    expect(resolveSpaceAdEnabled("")).toBe(true);
  });

  it("끄는 값과 대소문자·공백 변형을 모두 OFF 로 읽는다", () => {
    for (const rawValue of ["false", "0", "off", "no", "FALSE", " Off ", "\tNO\n"]) {
      expect(resolveSpaceAdEnabled(rawValue)).toBe(false);
    }
  });

  it("켜는 값과 알 수 없는 값은 노출로 읽는다", () => {
    for (const rawValue of ["true", "1", "on", "yes", "fasle", "disabled"]) {
      expect(resolveSpaceAdEnabled(rawValue)).toBe(true);
    }
  });
});
