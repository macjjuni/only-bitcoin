import { SPACE_BOUNDS, SPACE_ISLAND } from "./spaceWorld";

/**
 * 지형 질의 인터페이스.
 *
 * 벙커 시절에는 바닥이 평평해서 소품 사각형 목록(`SPACE_OBSTACLES`)만으로
 * 충분했다. 섬은 다층이라 "여기서 발이 닿는 높이" 와 "여기로 갈 수 있는지" 를
 * **충돌 메시에 직접 물어봐야** 한다.
 *
 * 그 질의는 three 의 BVH 가 하지만(`views/space/lib/islandTerrain`), 이동
 * 적분기(`stepMovement`)까지 three 에 묶으면 테스트에서 GLB 를 로드해야 하고
 * 서버는 아예 쓸 수 없다. 그래서 **질의 모양만 여기서 정하고 구현은 주입**한다.
 *
 * 좌표계는 모두 월드 기준이고 `feetY` 는 발바닥 높이다.
 */

export interface TerrainMoveResult {
  x: number;
  z: number;
  /**
   * 밀려난 방향의 **수평 단위 벡터**. 벽에 닿지 않았으면 둘 다 0 이다.
   *
   * 축별 `blocked` 불리언이 아니라 벡터인 이유는 **미끄러짐** 때문이다. 비스듬히
   * 선 벽에 부딪혔을 때 x·z 를 둘 다 지우면 벽에 닿는 순간 그 자리에 선다.
   * 법선 성분만 지우면 남은 접선 성분이 벽을 따라 흐른다.
   */
  pushX: number;
  pushZ: number;
}

export interface SpaceTerrain {
  /**
   * `(x, z)` 에서 발이 닿는 높이.
   *
   * **`feetY` 아래쪽만 본다.** 머리 위 아치나 다리 상판을 지면으로 잡으면
   * 그 밑을 지나갈 수 없다. 오를 수 있는 턱(`stepHeight`)까지는 위도 본다.
   *
   * 아래에 아무것도 없으면 바다 높이를 돌려준다. 바다로 떨어지는 일은
   * 가장자리 투명 벽이 막으므로 실제로는 거의 쓰이지 않는 안전값이다.
   */
  resolveGroundY(x: number, z: number, feetY: number): number;

  /**
   * `(x, z)` 로 가려는 시도를 벽 밖으로 밀어낸다.
   *
   * 오를 수 있는 턱보다 높은 면만 막는다. 계단 한 칸(0.25 m)은 막지 않고
   * `resolveGroundY` 가 올려준다.
   */
  resolveMove(x: number, z: number, feetY: number): TerrainMoveResult;

  /**
   * 머리 위 천장 높이. 없으면 `Number.POSITIVE_INFINITY`.
   *
   * 올라가는 중에만 본다. 궁전 안에서 점프해 천장을 뚫고 나가는 것을 막는다.
   */
  resolveCeilingY(x: number, z: number, feetY: number): number;
}

/** 아바타를 원기둥으로 보고 쓰는 반지름. 어깨 폭(약 0.6)의 절반보다 조금 작다. */
export const SPACE_AVATAR_COLLISION_RADIUS = 0.28;

/** 충돌 캡슐 높이. 아바타 키(1.81)에서 머리 윗점만 조금 깎았다. */
export const SPACE_AVATAR_COLLISION_HEIGHT = 1.7;

/**
 * 걸어서 오를 수 있는 턱 높이(m).
 *
 * 맵의 계단 한 칸이 복셀 한 칸(0.25 m)이다. 그보다 낮게 잡으면 계단마다
 * 막히고, 너무 높게 잡으면 허리 높이 난간을 타고 넘는다. 0.35 는 계단 한 칸에
 * 여유를 준 값이고 두 칸(0.5)은 넘지 못한다.
 */
export const SPACE_STEP_HEIGHT = 0.35;

/**
 * 지형 없이 도는 평지 구현.
 *
 * GLB 가 도착하기 전 첫 프레임과 단위 테스트가 쓴다. 광장 높이에 평평한 바닥이
 * 하나 있고 벽은 바깥 상자뿐이라고 본다. 짧은 순간이라 그 사이에 광장 밖으로
 * 걸어 나가도 GLB 가 붙는 순간 지형이 다시 잡는다.
 */
export const createFlatTerrain = (groundY: number = SPACE_ISLAND.plazaY): SpaceTerrain => ({
  resolveGroundY: () => groundY,
  resolveMove: (x, z) => ({
    x: Math.min(Math.max(x, SPACE_BOUNDS.minX), SPACE_BOUNDS.maxX),
    z: Math.min(Math.max(z, SPACE_BOUNDS.minZ), SPACE_BOUNDS.maxZ),
    pushX: 0,
    pushZ: 0,
  }),
  resolveCeilingY: () => Number.POSITIVE_INFINITY,
});
