import type { LocalPlayerState, SpaceTerrain } from "@/entities/space";
import { SPACE_BOUNDS } from "@/entities/space";

/** 아바타끼리 밀어내는 튜닝 값. 근거는 `docs/btc-space-3d.md` §5 에 있음. */
export const SPACE_SEPARATION = {
  /** 두 아바타 중심 사이 최소 거리(m). */
  minimumDistance: 0.7,
  /** 밀려나는 최대 속도(m/s). 걷기 4.5 보다 느려야 밀고 지나갈 수 있음. */
  maximumSpeed: 3,
  /** 한 스텝에 겹친 깊이 중 푸는 비율. 1 이면 경계에서 떨림. */
  stiffness: 0.5,
  /** 발 높이가 이보다 차이 나면 다른 층·점프 중으로 보고 무시함. */
  maximumHeightGap: 1,
} as const;

/** 정확히 같은 자리에 섰을 때 좌석마다 다른 쪽으로 비키게 하는 황금각. */
const tieBreakAngle = 2.399963;
const clamp = (value: number, minimum: number, maximum: number): number =>
  Math.min(maximum, Math.max(minimum, value));

interface SeparationTarget {
  x: number;
  y: number;
  z: number;
}

/**
 * 겹친 아바타에게서 **내 캐릭터만** 밀어냄. 남의 위치는 안 건드림.
 *
 * 내 위치는 내가 정해 보내는 값이라 밀린 결과가 그대로 동기화됨. 남을 밀면
 * 클라이언트마다 결과가 달라져 어긋남. 상대도 자기 화면에서 같은 규칙으로 비켜서
 * 둘이 절반씩 벌어짐.
 *
 * 단단한 벽이 아니라 느린 힘임. 좁은 길에 서 있는 사람을 밀고 지나갈 수 있어야 함.
 */
export const separateFromPlayers = (
  state: LocalPlayerState,
  others: readonly SeparationTarget[],
  tieBreaker: number,
  deltaSeconds: number,
  terrain: SpaceTerrain,
): LocalPlayerState => {
  if (others.length === 0) {
    return state;
  }

  let pushX = 0;
  let pushZ = 0;

  for (const other of others) {
    if (Math.abs(other.y - state.y) > SPACE_SEPARATION.maximumHeightGap) {
      continue;
    }
    const offsetX = state.x - other.x;
    const offsetZ = state.z - other.z;
    const distance = Math.hypot(offsetX, offsetZ);

    if (distance >= SPACE_SEPARATION.minimumDistance) {
      continue;
    }
    const depth = SPACE_SEPARATION.minimumDistance - distance;

    if (distance < 0.0001) {
      // 방향이 없음. 둘이 같은 쪽으로 가면 계속 겹쳐서 좌석으로 갈라놓음.
      pushX += Math.cos(tieBreaker * tieBreakAngle) * depth;
      pushZ += Math.sin(tieBreaker * tieBreakAngle) * depth;
      continue;
    }
    pushX += (offsetX / distance) * depth;
    pushZ += (offsetZ / distance) * depth;
  }

  const pushLength = Math.hypot(pushX, pushZ);

  if (pushLength < 0.0001) {
    return state;
  }
  const moveLength = Math.min(
    pushLength * SPACE_SEPARATION.stiffness,
    SPACE_SEPARATION.maximumSpeed * deltaSeconds,
  );
  // 벽 쪽으로 밀리면 지형이 되밀어냄. 벽을 뚫지 않음.
  const resolved = terrain.resolveMove(
    clamp(state.x + (pushX / pushLength) * moveLength, SPACE_BOUNDS.minX, SPACE_BOUNDS.maxX),
    clamp(state.z + (pushZ / pushLength) * moveLength, SPACE_BOUNDS.minZ, SPACE_BOUNDS.maxZ),
    state.y,
  );

  return { ...state, x: resolved.x, z: resolved.z };
};
