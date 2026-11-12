import { describe, expect, it } from "vitest";
import {
  parseSpaceClientFrame,
  parseSpaceServerFrame,
  SPACE_PROTOCOL_VERSION,
} from "./spaceProtocol";

describe("공간 시세 동기화 프로토콜", () => {
  const state = {
    revision: 1,
    track: "surge",
    direction: "rise",
    startsAt: 1000,
    prefetch: true,
    celebration: { id: "rise-1", startsAt: 1000, seed: 42 },
  };
  const parseState = (value: unknown) =>
    parseSpaceServerFrame(
      JSON.stringify({ v: SPACE_PROTOCOL_VERSION, t: "market", state: value, serverAt: 300 }),
    );

  it("상승 상태와 공유 폭죽 시각·seed를 읽는다", () => {
    expect(parseState(state)).toMatchObject({ t: "market", state });
  });

  it("잘못된 상태·하락 폭죽·음수 seed를 거절한다", () => {
    expect(parseState({ ...state, revision: -1 })).toBeNull();
    expect(parseState({ ...state, direction: "fall" })).toBeNull();
    expect(parseState({ ...state, celebration: { ...state.celebration, seed: -1 } })).toBeNull();
  });

  it("시계 요청은 유한한 양수 시각만 허용한다", () => {
    const frame = { v: SPACE_PROTOCOL_VERSION, t: "clock", sentAt: 12.5 };
    expect(parseSpaceClientFrame(JSON.stringify(frame))).toEqual(frame);
    expect(parseSpaceClientFrame(JSON.stringify({ ...frame, sentAt: -1 }))).toBeNull();
    expect(parseSpaceClientFrame(JSON.stringify({ ...frame, sentAt: null }))).toBeNull();
  });
});
