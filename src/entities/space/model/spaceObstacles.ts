import { SPACE_GROUND, SPACE_LOUNGE } from "./spaceWorld";

/**
 * 통과할 수 없는 소품 목록.
 *
 * 전에는 아바타가 소품을 그대로 통과했다. 그래서 소품을 벽 쪽에만 두고 중앙
 * 통로를 비워야 했다. 막아 두면 소품이 실제로 공간을 나누는 구조물이 되고,
 * 라운지가 "앉는 자리" 로 읽힌다.
 *
 * **x/z 축 정렬 사각형(AABB) + 윗면 높이**로 다룬다. 소품이 전부 회전 없는
 * 박스라 사각형으로 충분하다. 윗면 높이를 들고 있으므로 **점프해서 올라설 수**
 * 있다 — 발이 윗면보다 높으면 가로로 막지 않고, 그 높이를 새 지면으로 쓴다.
 *
 * 점프 정점은 `jumpSpeed² / (2·gravity) = 1.13 m` 다. 그보다 낮은 소품(테이블
 * 0.52, 상자·드럼통 0.9)에는 올라설 수 있고 선반(2.56)처럼 높은 것은 벽처럼
 * 막힌다. 서버의 높이 상한(`SPACE_MAX_JUMP_HEIGHT` 2.5)도 상자 위 점프
 * (0.9 + 1.13 = 2.03)를 담는다.
 *
 * 서버는 이 목록을 모른다. 경계와 이동 거리 예산만 검증하므로, 고친 클라이언트는
 * 소품을 통과할 수 있다. 외형 문제라 서버 검증까지 끌어올리지 않는다.
 */
export interface SpaceObstacle {
  centerX: number;
  centerZ: number;
  halfWidth: number;
  halfDepth: number;
  /** 윗면 높이(m). 발이 이보다 높으면 막지 않고 올라선다. */
  top: number;
}

/** 아바타를 원기둥으로 보고 쓰는 반지름. 어깨 폭(약 0.6)의 절반보다 조금 작다. */
export const SPACE_AVATAR_COLLISION_RADIUS = 0.28;

/**
 * 윗면으로 인정하는 발 높이 여유.
 *
 * 착지 좌표가 부동소수점 때문에 윗면보다 미세하게 낮을 수 있다. 그 순간 가로로
 * 막으면 상자 위에서 발이 걸린다.
 */
const STEP_TOLERANCE = 0.02;

const roomHalfWidth = SPACE_GROUND.width / 2;

/**
 * 뒷벽 양 끝 서버 랙. 랙 3개가 붙어 한 덩어리로 선다.
 *
 * 이동 경계를 패널 쪽으로 당기면서(`minZ = -16.6`) 랙 몸통이 걸어갈 수 있는
 * 영역에 들어왔다. 막지 않으면 랙을 뚫고 벽에 박힌다. 높이 2.2 m 라 점프로는
 * 올라설 수 없다.
 */
const serverRackObstacles: readonly SpaceObstacle[] = [-1, 1].map(
  (side): SpaceObstacle => ({
    centerX: side * (roomHalfWidth - 3.6),
    centerZ: -16.6,
    halfWidth: 2.1,
    halfDepth: 0.48,
    top: 2.2,
  }),
);

/** 좌우 벽 선반. 보드가 여러 장이지만 막는 범위는 한 덩어리다. */
const shelfObstacles: readonly SpaceObstacle[] = [-1, 1].flatMap((side) =>
  [-8, 2].map(
    (centerZ): SpaceObstacle => ({
      centerX: side * (roomHalfWidth - 0.7),
      centerZ,
      halfWidth: 0.6,
      halfDepth: 2.2,
      /** 상단 보드가 2.56 m. 점프 정점(1.13)으로는 못 오른다. */
      top: 2.56,
    }),
  ),
);

/** 선반 위·아래 적재 상자. 선반과 겹치는 사각형은 한 덩어리로 밀어내므로 문제없다. */
const crateObstacles: readonly SpaceObstacle[] = [-1, 1].flatMap((side): SpaceObstacle[] => [
  {
    centerX: side * (roomHalfWidth - 0.8),
    centerZ: -8.1,
    halfWidth: 0.45,
    halfDepth: 1.2,
    top: 2.1,
  },
  {
    centerX: side * (roomHalfWidth - 0.8),
    centerZ: 3.4,
    halfWidth: 0.45,
    halfDepth: 0.55,
    top: 0.97,
  },
  {
    centerX: side * (roomHalfWidth - 1.55),
    centerZ: 11.1,
    halfWidth: 0.45,
    halfDepth: 0.45,
    top: 0.9,
  },
]);

/** 러그 중앙 테이블과 둘레 드럼통 의자. 좌표는 `BunkerProps` 와 같은 값을 쓴다. */
const BARREL_SIZE = { halfWidth: 0.43, halfDepth: 0.43, top: 0.9 } as const;
const loungeObstacles: readonly SpaceObstacle[] = [
  { centerX: 0, centerZ: SPACE_LOUNGE.centerZ, halfWidth: 1.3, halfDepth: 0.75, top: 0.52 },
  { centerX: -7.5, centerZ: SPACE_LOUNGE.centerZ + 2, ...BARREL_SIZE },
  { centerX: 7.5, centerZ: SPACE_LOUNGE.centerZ + 2, ...BARREL_SIZE },
  { centerX: -4, centerZ: SPACE_LOUNGE.centerZ + 5.2, ...BARREL_SIZE },
  { centerX: 4, centerZ: SPACE_LOUNGE.centerZ + 5.2, ...BARREL_SIZE },
  { centerX: 0, centerZ: SPACE_LOUNGE.centerZ + 5.5, ...BARREL_SIZE },
];

export const SPACE_OBSTACLES: readonly SpaceObstacle[] = [
  ...serverRackObstacles,
  ...shelfObstacles,
  ...crateObstacles,
  ...loungeObstacles,
];

/**
 * 소품을 파고든 위치를 바깥으로 밀어낸다.
 *
 * 겹친 깊이가 더 **얕은 축**으로 밀어낸다. 깊은 축으로 밀면 소품을 가로질러
 * 반대편으로 순간이동한다. 한 번의 이동량이 소품 크기보다 작으므로 이 선택이
 * 항상 "방금 들어온 방향" 이 된다.
 *
 * 발이 소품 윗면보다 높으면 건너뛴다 — 그 위를 걸어다니는 상태다.
 *
 * 겹친 소품이 여러 개일 수 있어(코너) 순서대로 모두 해소한다. 한 번만 훑으므로
 * **두 소품 사이 틈이 아바타 지름보다 좁으면** 양쪽으로 번갈아 밀려 끼인다.
 * 그런 틈을 만들지 않는 것은 배치의 책임이고 `spaceObstacles.test.ts` 가 고정한다.
 */
export const resolveObstacleCollision = (
  x: number,
  z: number,
  feetY: number = 0,
  radius: number = SPACE_AVATAR_COLLISION_RADIUS,
  obstacles: readonly SpaceObstacle[] = SPACE_OBSTACLES,
): { x: number; z: number; blockedX: boolean; blockedZ: boolean } => {
  let resolvedX = x;
  let resolvedZ = z;
  let blockedX = false;
  let blockedZ = false;

  for (const obstacle of obstacles) {
    if (feetY + STEP_TOLERANCE >= obstacle.top) {
      continue;
    }

    const limitX = obstacle.halfWidth + radius;
    const limitZ = obstacle.halfDepth + radius;
    const deltaX = resolvedX - obstacle.centerX;
    const deltaZ = resolvedZ - obstacle.centerZ;
    const overlapX = limitX - Math.abs(deltaX);
    const overlapZ = limitZ - Math.abs(deltaZ);

    if (overlapX <= 0 || overlapZ <= 0) {
      continue;
    }

    if (overlapX < overlapZ) {
      // 중심이 정확히 겹친 경우(스폰 등)에는 한쪽 방향을 정해 밀어낸다.
      resolvedX = obstacle.centerX + (deltaX === 0 ? limitX : Math.sign(deltaX) * limitX);
      blockedX = true;
      continue;
    }

    resolvedZ = obstacle.centerZ + (deltaZ === 0 ? limitZ : Math.sign(deltaZ) * limitZ);
    blockedZ = true;
  }

  return { x: resolvedX, z: resolvedZ, blockedX, blockedZ };
};

/**
 * 해당 위치에서 발이 닿는 높이.
 *
 * 소품 윗면 중 **중심이 사각형 안에 들어오는** 것들의 최고 높이를 돌려준다.
 * 충돌 판정처럼 반지름을 더해 넓히지 않는다 — 넓히면 상자 옆에 서 있어도 공중에
 * 뜬다. 발끝이 모서리에 살짝 걸치는 것은 허용한다.
 */
export const resolveGroundHeight = (
  x: number,
  z: number,
  obstacles: readonly SpaceObstacle[] = SPACE_OBSTACLES,
): number => {
  let groundHeight = 0;

  for (const obstacle of obstacles) {
    const isOver =
      Math.abs(x - obstacle.centerX) <= obstacle.halfWidth &&
      Math.abs(z - obstacle.centerZ) <= obstacle.halfDepth;

    if (isOver && obstacle.top > groundHeight) {
      groundHeight = obstacle.top;
    }
  }

  return groundHeight;
};
