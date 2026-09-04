import { describe, expect, it } from "vitest";
import { parseChatServerFrame } from "./chatProtocol";

describe("parseChatServerFrame", () => {
  it("유효한 online frame을 반환한다", () => {
    expect(parseChatServerFrame('{"v":1,"t":"online","n":3}')).toEqual({
      v: 1,
      t: "online",
      n: 3,
    });
  });

  it("버전, 타입 또는 필수 payload가 잘못된 frame을 거부한다", () => {
    expect(parseChatServerFrame('{"v":2,"t":"online","n":3}')).toBeNull();
    expect(parseChatServerFrame('{"v":1,"t":"unknown"}')).toBeNull();
    expect(parseChatServerFrame('{"v":1,"t":"online","n":"3"}')).toBeNull();
    expect(parseChatServerFrame("not-json")).toBeNull();
  });
});
