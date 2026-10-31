import { describe, expect, it } from "vitest";
import { SPACE_MAX_OCCUPANTS } from "@/entities/space";
import { selectSpaceAvatarSlots } from "./avatarCapacity";

describe("selectSpaceAvatarSlots", () => {
  it("외부 목록이 50명을 넘어도 버퍼 용량 안에서 원래 순서와 플레이어를 보존한다", () => {
    const players = Array.from({ length: SPACE_MAX_OCCUPANTS + 1 }, (_, seat) => ({ seat }));
    const selectedPlayers = selectSpaceAvatarSlots(players);

    expect(selectedPlayers).toHaveLength(SPACE_MAX_OCCUPANTS);
    expect(selectedPlayers.every((player, index) => player === players[index])).toBe(true);
    expect(players).toHaveLength(SPACE_MAX_OCCUPANTS + 1);
  });

  it("퇴장 후 빈 목록에는 렌더 슬롯을 남기지 않는다", () => {
    expect(selectSpaceAvatarSlots([])).toEqual([]);
  });
});
