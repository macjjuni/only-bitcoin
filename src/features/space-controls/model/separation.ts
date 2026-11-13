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

/** 보스 같은 큰 몸통 하나. 아바타와 달리 밀고 지나갈 수 없음. */
export interface SolidBody {
  x: number;
  /** 발바닥 높이. */
  y: number;
  z: number;
  /** 몸통 반지름(m). 내 아바타 반지름은 여기에 더해서 봄. */
  radius: number;
  /** 키(m). 이보다 높이 있으면(위층·발코니) 안 막음. */
  height: number;
}

/** 단단한 몸통에서 밀려나는 튜닝 값. */
export const SPACE_SOLID_BODY = {
  /**
   * 밀려나는 최대 속도(m/s). 달리기(8)와 같게 잡았음.
   *
   * 느리면 달려서 파고들 수 있고, 한 번에 다 밀어내면 보스가 다가올 때 순간이동처럼
   * 튐. 서버의 이동 속도 상한(8.5)보다 작아서 밀린 이동이 반려되지 않음.
   */
  maximumSpeed: 8,
  /** 발이 몸통 발바닥보다 이만큼 아래여도 막음(m). 바닥 높이 오차와 턱을 흡수함. */
  footTolerance: 1,
} as const;

/**
 * 단단한 몸통과 겹쳤으면 **내 캐릭터를** 몸통 밖으로 밀어냄.
 *
 * `separateFromPlayers` 와 달리 밀고 지나갈 수 없음. 깊이 비례가 아니라 최대 속도로
 * 바로 밀어내서, 달려서 부딪혀도 경계에서 멈춤.
 */
export const separateFromSolidBody = (
  state: LocalPlayerState,
  body: SolidBody | null,
  avatarRadius: number,
  tieBreaker: number,
  deltaSeconds: number,
  terrain: SpaceTerrain,
): LocalPlayerState => {
  if (!body) {
    return state;
  }

  const isBeside =
    state.y >= body.y - SPACE_SOLID_BODY.footTolerance && state.y <= body.y + body.height;
  const offsetX = state.x - body.x;
  const offsetZ = state.z - body.z;
  const distance = Math.hypot(offsetX, offsetZ);
  const minimumDistance = body.radius + avatarRadius;

  if (!isBeside || distance >= minimumDistance) {
    return state;
  }

  const moveLength = Math.min(
    minimumDistance - distance,
    SPACE_SOLID_BODY.maximumSpeed * deltaSeconds,
  );
  // 정확히 한가운데면 방향이 없음. 좌석마다 다른 쪽으로 내보냄.
  const directionX = distance < 0.0001 ? Math.cos(tieBreaker * tieBreakAngle) : offsetX / distance;
  const directionZ = distance < 0.0001 ? Math.sin(tieBreaker * tieBreakAngle) : offsetZ / distance;
  // 벽 쪽으로 밀리면 지형이 되밀어냄. 벽을 뚫지 않음.
  const resolved = terrain.resolveMove(
    clamp(state.x + directionX * moveLength, SPACE_BOUNDS.minX, SPACE_BOUNDS.maxX),
    clamp(state.z + directionZ * moveLength, SPACE_BOUNDS.minZ, SPACE_BOUNDS.maxZ),
    state.y,
  );

  return { ...state, x: resolved.x, z: resolved.z };
};
