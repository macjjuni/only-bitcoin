import { BufferAttribute, BufferGeometry } from "three";
import { describe, expect, it } from "vitest";
import { SPACE_AVATAR_COLLISION_RADIUS, SPACE_STEP_HEIGHT } from "@/entities/space";
import { createIslandTerrain } from "@/views/space/lib/islandTerrain";

/**
 * 지형 질의를 **손으로 만든 지오메트리**로 고정한다.
 *
 * 실제 맵(`bitcoin_island_draco.glb`)으로 재면 Draco 디코더를 Node 에서
 * 돌려야 하고, 실패했을 때 "맵이 바뀐 것" 과 "질의가 깨진 것" 을 가를 수 없다.
 * 여기서는 계단 한 칸·벽·천장만 있는 최소 지형을 세워 **규칙 자체**를 본다.
 */

interface Quad {
  /** 왼쪽 아래 → 오른쪽 아래 → 오른쪽 위 → 왼쪽 위 순서. */
  corners: [number, number, number][];
}

// region [Privates]
/**
 * 위를 보는 수평면.
 *
 * `FrontSide` 레이캐스트가 법선 방향으로 앞뒷면을 가르므로 **감는 방향이
 * 결과를 바꾼다.** 반시계로 감아 법선이 +Y 가 되게 한다.
 */
const createFloor = (y: number, minX: number, maxX: number, minZ: number, maxZ: number): Quad => ({
  corners: [
    [minX, y, maxZ],
    [maxX, y, maxZ],
    [maxX, y, minZ],
    [minX, y, minZ],
  ],
});

/** 아래를 보는 수평면. 천장이다. */
const createCeiling = (
  y: number,
  minX: number,
  maxX: number,
  minZ: number,
  maxZ: number,
): Quad => ({
  corners: [
    [minX, y, minZ],
    [maxX, y, minZ],
    [maxX, y, maxZ],
    [minX, y, maxZ],
  ],
});

/**
 * `x` 에 선 벽.
 *
 * 수평 충돌은 삼각형까지의 **최단 거리**로 밀어내므로 감는 방향과 무관하게
 * 양쪽을 막는다. 감는 방향이 결과를 바꾸는 것은 레이캐스트(`FrontSide`)뿐이다.
 */
const createWallAtX = (
  x: number,
  minY: number,
  maxY: number,
  minZ: number,
  maxZ: number,
): Quad => ({
  corners: [
    [x, minY, minZ],
    [x, minY, maxZ],
    [x, maxY, maxZ],
    [x, maxY, minZ],
  ],
});

const createGeometry = (quads: Quad[]): BufferGeometry => {
  const positions = new Float32Array(quads.length * 4 * 3);
  const indices = new Uint32Array(quads.length * 6);

  quads.forEach((quad, quadIndex) => {
    quad.corners.forEach((corner, cornerIndex) => {
      positions.set(corner, (quadIndex * 4 + cornerIndex) * 3);
    });

    const base = quadIndex * 4;
    indices.set([base, base + 1, base + 2, base, base + 2, base + 3], quadIndex * 6);
  });

  const geometry = new BufferGeometry();
  geometry.setAttribute("position", new BufferAttribute(positions, 3));
  geometry.setIndex(new BufferAttribute(indices, 1));

  return geometry;
};
// endregion

/**
 * 테스트 지형.
 *
 * ```text
 *        천장 2.0 ────────── (x 6~12)
 *   벽 3.0 ┃
 *          ┃ 턱 0.25
 *   ───────┸───────────────── 바닥 0
 *   x:    -10   2   4        12
 * ```
 */
const createTestTerrain = () => {
  return createIslandTerrain(
    createGeometry([
      createFloor(0, -10, 12, -10, 10),
      // 걸어서 오를 수 있는 턱(복셀 한 칸)과 그 옆면.
      createFloor(0.25, 2, 4, -10, 10),
      createWallAtX(2, 0, 0.25, -10, 10),
      // 점프로도 못 넘는 벽.
      createWallAtX(6, 0, 3, -10, 10),
      createCeiling(2, 6, 12, -10, 10),
    ]),
  );
};

describe("resolveGroundY", () => {
  const terrain = createTestTerrain();

  it("평지에서는 바닥 높이를 돌려준다", () => {
    expect(terrain.resolveGroundY(0, 0, 0)).toBe(0);
  });

  it("오를 수 있는 턱 위에 올려 준다", () => {
    // 서 있는 높이보다 위지만 `SPACE_STEP_HEIGHT` 안이라 걸어서 오른다.
    expect(terrain.resolveGroundY(3, 0, 0)).toBeCloseTo(0.25, 6);
  });

  it("오를 수 있는 턱보다 높은 면은 지면으로 쓰지 않는다", () => {
    // 캡슐 아랫점 위로는 보지 않으므로 벽 너머 바닥(0)이 그대로 지면이다.
    const groundY = terrain.resolveGroundY(3, 0, -1);

    expect(groundY).toBe(0);
    expect(SPACE_STEP_HEIGHT).toBeLessThan(1.25);
  });

  it("머리 위 천장을 지면으로 잡지 않는다", () => {
    // 위에서 아래로 훑으면 천장(2.0)이 먼저 걸린다. 그 밑을 지나갈 수 없게 된다.
    expect(terrain.resolveGroundY(9, 0, 0)).toBe(0);
  });

  it("아래에 아무것도 없으면 바다 높이를 돌려준다", () => {
    expect(terrain.resolveGroundY(100, 100, 0)).toBe(0);
  });
});

describe("resolveMove", () => {
  const terrain = createTestTerrain();

  it("빈 곳에서는 밀어내지 않는다", () => {
    expect(terrain.resolveMove(0, 0, 0)).toEqual({ x: 0, z: 0, pushX: 0, pushZ: 0 });
  });

  it("오를 수 있는 턱은 가로로 막지 않는다", () => {
    // 캡슐 아랫점이 턱보다 위라 턱의 옆면을 아예 만나지 않는다.
    expect(terrain.resolveMove(2.1, 0, 0).pushX).toBe(0);
  });

  it("오를 수 없는 벽은 다가온 쪽으로 반지름만큼 밀어낸다", () => {
    const moved = terrain.resolveMove(5.9, 0, 0);

    expect(moved.x).toBeCloseTo(6 - SPACE_AVATAR_COLLISION_RADIUS, 4);
    expect(moved.pushX).toBeCloseTo(-1, 4);
    expect(moved.pushZ).toBeCloseTo(0, 4);
  });

  it("벽은 양쪽에서 막는다", () => {
    // 삼각형까지의 최단 거리로 밀어내므로 감는 방향과 무관하다. 한쪽만
    // 막으면 벽을 등지고 선 아바타가 벽 안으로 끌려 들어간다.
    const moved = terrain.resolveMove(6.1, 0, 0);

    expect(moved.x).toBeCloseTo(6 + SPACE_AVATAR_COLLISION_RADIUS, 4);
    expect(moved.pushX).toBeCloseTo(1, 4);
  });

  it("벽 위에 올라선 높이에서는 막지 않는다", () => {
    // 발이 벽 윗면(3)에 있으면 캡슐이 벽보다 위다.
    expect(terrain.resolveMove(6.1, 0, 3).pushX).toBe(0);
  });

  it("바닥·천장처럼 수평인 면은 수평으로 밀지 않는다", () => {
    // 수평 성분이 0 이라 건너뛴다. 밀면 바닥 위에서 옆으로 미끄러진다.
    expect(terrain.resolveMove(9, 0, 1.9)).toMatchObject({ pushX: 0, pushZ: 0 });
  });
});

describe("resolveCeilingY", () => {
  const terrain = createTestTerrain();

  it("하늘 아래에서는 상한이 없다", () => {
    expect(terrain.resolveCeilingY(0, 0, 0)).toBe(Number.POSITIVE_INFINITY);
  });

  it("천장 높이에서 아바타 키를 뺀 값이 발바닥 상한이다", () => {
    // 천장 2.0, 충돌 캡슐 높이 1.7 → 발바닥은 0.3 까지만 오를 수 있다.
    expect(terrain.resolveCeilingY(9, 0, 0)).toBeCloseTo(0.3, 6);
  });

  it("서 있는 바닥을 천장으로 세지 않는다", () => {
    // 위로 가는 레이가 상향면의 뒷면까지 세면 제자리에서 점프가 막힌다.
    expect(terrain.resolveCeilingY(0, 0, 0)).toBe(Number.POSITIVE_INFINITY);
  });
});

describe("resolveCameraPosition", () => {
  const terrain = createTestTerrain();

  it("지형이 없으면 카메라를 그대로 둔다", () => {
    const camera = { x: -4, y: 2, z: 0 };

    expect(terrain.resolveCameraPosition({ x: 0, y: 1.75, z: 0 }, camera, 0.4)).toEqual(camera);
  });

  it("벽 너머로 물러난 카메라를 벽 앞으로 당긴다", () => {
    const focus = { x: 4, y: 1.75, z: 0 };
    const safe = terrain.resolveCameraPosition(focus, { x: 10, y: 1.75, z: 0 }, 0.4);

    // 벽이 x = 6 이므로 여유 0.4 를 빼면 5.6 이다.
    expect(safe.x).toBeCloseTo(5.6, 4);
    expect(safe.z).toBeCloseTo(0, 6);
  });
});
