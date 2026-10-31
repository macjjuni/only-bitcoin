import { describe, expect, it } from "vitest";
import type { RemotePlayer, SpaceChatMessage } from "@/entities/space";
import { type ReceivedSpaceMessage, selectSpaceChatBubbles } from "./chatBubbles";

const createMessage = (
  seat: number,
  receivedAt: number,
  body = "안녕하세요",
): ReceivedSpaceMessage => ({
  receivedAt,
  message: {
    id: `${seat}:${receivedAt}`,
    rid: "request",
    seat,
    nickname: `사토시${seat}`,
    body,
    createdAt: 1,
  } satisfies SpaceChatMessage,
});
const createPlayer = (seat: number, x = seat): RemotePlayer => ({
  seat,
  x,
  z: 0,
  yaw: 0,
  nickname: `사토시${seat}`,
  colorIndex: 0,
});

describe("공간 채팅 말풍선", () => {
  it("서버 시각 대신 수신 후 5초 TTL을 사용하고 최신 발화만 남긴다", () => {
    const messages = [createMessage(0, 0), createMessage(1, 1000), createMessage(1, 2000, "최신")];
    const bubbles = selectSpaceChatBubbles(
      messages,
      [createPlayer(0), createPlayer(1)],
      { x: 0, z: 0 },
      5000,
    );
    expect(bubbles).toHaveLength(1);
    expect(bubbles[0].message.body).toBe("최신");
    expect(selectSpaceChatBubbles(messages, [createPlayer(1)], { x: 0, z: 0 }, 7000)).toEqual([]);
  });

  it("퇴장한 좌석과 25m 밖은 숨기고 가까운 12명을 선택한다", () => {
    const players = Array.from({ length: 16 }, (_, seat) => createPlayer(seat));
    players.push(createPlayer(30, 30));
    const messages = Array.from({ length: 31 }, (_, seat) => createMessage(seat, 0));
    const bubbles = selectSpaceChatBubbles(messages, players, { x: 0, z: 0 }, 100);
    expect(bubbles.map(({ seat }) => seat)).toEqual(Array.from({ length: 12 }, (_, seat) => seat));
    expect(selectSpaceChatBubbles(messages, [], { x: 0, z: 0 }, 100)).toEqual([]);
  });
});
