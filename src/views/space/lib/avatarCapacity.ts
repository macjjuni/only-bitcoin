import { SPACE_MAX_OCCUPANTS } from "@/entities/space";

/** 더미 생성과 GPU 인스턴스 버퍼가 같은 0~50 슬롯 범위를 사용하게 한다. */
export const resolveSpaceAvatarCount = (requestedCount: number): number => {
  if (!Number.isFinite(requestedCount)) {
    return 0;
  }

  return Math.min(Math.max(Math.trunc(requestedCount), 0), SPACE_MAX_OCCUPANTS);
};

/** 외부 플레이어 목록도 고정된 GPU 버퍼 용량을 넘지 않게 자른다. */
export const selectSpaceAvatarSlots = <Player>(players: readonly Player[]): readonly Player[] => {
  return players.slice(0, resolveSpaceAvatarCount(players.length));
};

/**
 * 모델별로 사람을 묶는다.
 *
 * 모델마다 지오메트리가 달라 `InstancedMesh` 를 따로 써야 한다. 사람이 없는
 * 모델은 아예 내려(그룹을 렌더하지 않아) 그 모델의 glb 를 받지 않게 한다 —
 * 아무도 곰을 고르지 않았으면 곰 에셋(143 KB)을 내려받을 이유가 없다.
 *
 * 돌려주는 순서는 **모델 번호 오름차순**이다. 사람이 드나들 때 그룹 순서가
 * 바뀌면 React 가 `InstancedMesh` 를 다시 만든다.
 */
export const groupPlayersByModel = <T extends { modelIndex: number }>(
  players: readonly T[],
): { modelIndex: number; players: T[] }[] => {
  const groups = new Map<number, T[]>();

  for (const player of players) {
    const existing = groups.get(player.modelIndex);

    if (existing) {
      existing.push(player);
      continue;
    }
    groups.set(player.modelIndex, [player]);
  }

  return [...groups.entries()]
    .sort(([left], [right]) => left - right)
    .map(([modelIndex, grouped]) => ({ modelIndex, players: grouped }));
};
