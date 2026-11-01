import { describe, expect, it } from "vitest";
import { SPACE_MAX_OCCUPANTS } from "@/entities/space";
import { groupPlayersByModel, selectSpaceAvatarSlots } from "./avatarCapacity";

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

describe("groupPlayersByModel", () => {
  const player = (seat: number, modelIndex: number) => ({ seat, modelIndex });

  it("모델 번호 오름차순으로 묶는다", () => {
    // 순서가 흔들리면 React 가 InstancedMesh 를 다시 만든다.
    const groups = groupPlayersByModel([player(0, 1), player(1, 0), player(2, 1)]);

    expect(groups.map((group) => group.modelIndex)).toEqual([0, 1]);
    expect(groups[1].players.map((p) => p.seat)).toEqual([0, 2]);
  });

  it("사람이 없는 모델은 그룹을 만들지 않는다", () => {
    // 그룹이 없으면 그 모델 에셋을 내려받지도 않는다.
    const groups = groupPlayersByModel([player(0, 0)]);

    expect(groups).toHaveLength(1);
    expect(groups[0].modelIndex).toBe(0);
  });

  it("빈 목록은 빈 배열이다", () => {
    expect(groupPlayersByModel([])).toEqual([]);
  });
});
