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
