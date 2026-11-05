import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  SPACE_BILLBOARD,
  SPACE_BLOCK_DASHBOARD,
  SPACE_BOUNDS,
  SPACE_CAMERA_BOUNDS,
  SPACE_HALL,
  SPACE_MAX_ALTITUDE,
  SPACE_MENU_FRAME,
  SPACE_SCREEN_FRAME,
  SPACE_SCREEN_GLOW_POSITIONS,
  SPACE_SCREEN_HALF,
  SPACE_SCREEN_PLACEMENTS,
  SPACE_SCREEN_SCALE,
  SPACE_SPAWN_FACING,
  SPACE_SPAWN_RING,
  SPACE_STEP_HEIGHT,
} from "@/entities/space";

/**
 * 월드 상수를 **맵 GLB 와 맞춰 둔다.**
 *
 * `spaceWorld.ts` 의 좌표는 `bitcoin_hall_draco.glb` 에서 읽은 값에 `mapOffsetY`
 * 를 더한 것임. 맵을 다시 구우면 조용히 어긋나고, 결과가 "전광판이 액자 옆에
 * 떠 있다" 처럼 화면을 봐야만 보여서 여기서 고정함.
 *
 * Draco 로 압축돼도 **JSON 청크는 평문**이라 노드 좌표·extras·액세서 min/max 는
 * 디코더 없이 읽힘.
 */

interface GltfAccessor {
  min: number[];
  max: number[];
}

interface GltfNode {
  name: string;
  mesh?: number;
  translation?: number[];
  scale?: number[];
  extras?: {
    spawn?: boolean;
    lamp?: boolean;
    collision?: boolean;
    screen_anchor?: boolean;
    menu_anchor?: boolean;
    width_m?: number;
    height_m?: number;
  };
}

interface GltfJson {
  accessors: GltfAccessor[];
  meshes: { primitives: { attributes: { POSITION: number } }[] }[];
  nodes: GltfNode[];
}

const GLB_JSON_CHUNK_OFFSET = 20;

// region [Privates]
const readHallGltf = (): GltfJson => {
  const buffer = readFileSync(resolve(process.cwd(), "public/models/bitcoin_hall_draco.glb"));
  const jsonLength = buffer.readUInt32LE(12);

  return JSON.parse(
    buffer.subarray(GLB_JSON_CHUNK_OFFSET, GLB_JSON_CHUNK_OFFSET + jsonLength).toString("utf8"),
  ) as GltfJson;
};

const hall = readHallGltf();

const findNode = (name: string): GltfNode => {
  const node = hall.nodes.find((candidate) => candidate.name === name);

  if (!node) {
    throw new Error(`맵 GLB 에 '${name}' 노드가 없습니다.`);
  }

  return node;
};

/** 노드 메시 정점의 경계 상자. 프리미티브가 여럿이면 합친다. */
const readNodeBounds = (name: string): GltfAccessor => {
  const meshIndex = findNode(name).mesh;

  if (meshIndex === undefined) {
    throw new Error(`'${name}' 노드에 메시가 없습니다.`);
  }

  const accessors = hall.meshes[meshIndex].primitives.map(
    (primitive) => hall.accessors[primitive.attributes.POSITION],
  );

  return {
    min: [0, 1, 2].map((axis) => Math.min(...accessors.map((accessor) => accessor.min[axis]))),
    max: [0, 1, 2].map((axis) => Math.max(...accessors.map((accessor) => accessor.max[axis]))),
  };
};

/** GLB 좌표를 월드 좌표로. 높이만 올린다. */
const toWorld = (translation: number[] = []): number[] => {
  const [x = 0, y = 0, z = 0] = translation;

  return [x, y + SPACE_HALL.mapOffsetY, z];
};
// endregion

describe("홀 높이", () => {
  it("라운지와 홀 바닥이 GLB 스폰 노드 높이와 같다", () => {
    expect(toWorld(findNode("Spawn_Lounge").translation)[1]).toBe(SPACE_HALL.loungeY);
    expect(toWorld(findNode("Spawn_Door").translation)[1]).toBe(SPACE_HALL.floorY);
  });

  it("가장 낮은 바닥도 서버가 받는 0 이상이고 낙하 판정선보다 위에 있다", () => {
    // 스냅샷·서버가 y ≥ 0 만 받는다. 라운지가 0 에 딱 붙으면 양자화 오차로
    // 음수가 섞여 이동이 반려된다.
    const { min } = readNodeBounds("Collision");
    const lowestFloor = min[1] + SPACE_HALL.mapOffsetY;

    expect(lowestFloor).toBe(SPACE_HALL.loungeY);
    expect(SPACE_HALL.fallResetY).toBeGreaterThanOrEqual(0);
    expect(lowestFloor - SPACE_HALL.fallResetY).toBeGreaterThanOrEqual(0.5);
  });

  it("턱 높이로 0.5 m 단차 한 칸은 오르고 두 칸은 못 오른다", () => {
    expect(SPACE_STEP_HEIGHT).toBeGreaterThan(0.5);
    expect(SPACE_STEP_HEIGHT).toBeLessThan(1);
  });
});

describe("이동 경계", () => {
  it("충돌 메시 전체를 덮는다", () => {
    const { min, max } = readNodeBounds("Collision");

    expect(SPACE_BOUNDS.minX).toBeLessThanOrEqual(min[0]);
    expect(SPACE_BOUNDS.maxX).toBeGreaterThanOrEqual(max[0]);
    expect(SPACE_BOUNDS.minZ).toBeLessThanOrEqual(min[2]);
    expect(SPACE_BOUNDS.maxZ).toBeGreaterThanOrEqual(max[2]);
  });

  it("모든 스폰 노드를 담는다", () => {
    const spawns = hall.nodes.filter((node) => node.extras?.spawn === true);

    expect(spawns.length).toBeGreaterThan(0);

    for (const spawn of spawns) {
      const [x, , z] = toWorld(spawn.translation);

      expect(x).toBeGreaterThan(SPACE_BOUNDS.minX);
      expect(x).toBeLessThan(SPACE_BOUNDS.maxX);
      expect(z).toBeGreaterThan(SPACE_BOUNDS.minZ);
      expect(z).toBeLessThan(SPACE_BOUNDS.maxZ);
    }
  });

  it("높이 상한이 충돌 메시 꼭대기보다 위에 있다", () => {
    const top = readNodeBounds("Collision").max[1] + SPACE_HALL.mapOffsetY;

    expect(SPACE_MAX_ALTITUDE).toBeGreaterThan(top);
    expect(SPACE_MAX_ALTITUDE).toBeLessThan(top * 1.5);
  });

  it("스냅샷 2바이트 높이 칸에 들어간다", () => {
    expect(SPACE_MAX_ALTITUDE * 100).toBeLessThanOrEqual(0xffff);
  });
});

describe("카메라 범위", () => {
  it("홀 외벽 안쪽과 천장 아래에 묶인다", () => {
    // 실내라 벽 밖으로 나가면 바깥 허공이 비친다.
    const ceiling = readNodeBounds("Hall").max[1] + SPACE_HALL.mapOffsetY;

    expect(SPACE_CAMERA_BOUNDS.minX).toBeGreaterThan(SPACE_BOUNDS.minX);
    expect(SPACE_CAMERA_BOUNDS.maxX).toBeLessThan(SPACE_BOUNDS.maxX);
    expect(SPACE_CAMERA_BOUNDS.minZ).toBeGreaterThan(SPACE_BOUNDS.minZ);
    expect(SPACE_CAMERA_BOUNDS.maxZ).toBeLessThan(SPACE_BOUNDS.maxZ);
    expect(SPACE_CAMERA_BOUNDS.maxY).toBeLessThan(ceiling);
  });
});

describe("스폰 원", () => {
  it("라운지 스폰 노드를 감싸는 라운지 바닥 고리다", () => {
    const [loungeX, loungeY, loungeZ] = toWorld(findNode("Spawn_Lounge").translation);
    const distance = Math.hypot(
      SPACE_SPAWN_RING.centerX - loungeX,
      SPACE_SPAWN_RING.centerZ - loungeZ,
    );

    expect(SPACE_SPAWN_RING.y).toBe(SPACE_HALL.loungeY);
    expect(loungeY).toBeCloseTo(SPACE_HALL.loungeY, 5);
    expect(distance).toBeGreaterThanOrEqual(SPACE_SPAWN_RING.minRadius);
    expect(distance).toBeLessThanOrEqual(SPACE_SPAWN_RING.maxRadius);
  });

  it("메인 전광판을 바라보게 되어 있다", () => {
    expect([...SPACE_SPAWN_FACING]).toEqual([...SPACE_SCREEN_FRAME.position]);
  });
});

describe("메인 전광판", () => {
  const anchor = findNode("Screen_Anchor");

  it("액자 치수가 GLB `Screen_Anchor` 와 같다", () => {
    expect(anchor.extras?.screen_anchor).toBe(true);
    expect(SPACE_SCREEN_FRAME.width).toBe(anchor.extras?.width_m);
    expect(SPACE_SCREEN_FRAME.height).toBe(anchor.extras?.height_m);
  });

  it("앵커 앞 5 cm 에 +Z 방향으로 선다", () => {
    const [x, y, z] = toWorld(anchor.translation);

    expect(SPACE_SCREEN_FRAME.position[0]).toBeCloseTo(x, 5);
    expect(SPACE_SCREEN_FRAME.position[1]).toBeCloseTo(y, 5);
    expect(SPACE_SCREEN_FRAME.position[2]).toBeCloseTo(z + 0.05, 5);
    expect(SPACE_SCREEN_FRAME.rotationY).toBe(0);
  });

  it("두 패널이 비율을 지킨 채 액자 반쪽씩을 꽉 채운다", () => {
    expect(SPACE_SCREEN_HALF.width * 2).toBeCloseTo(SPACE_SCREEN_FRAME.width, 9);
    expect(SPACE_BILLBOARD.width * SPACE_SCREEN_SCALE).toBeCloseTo(SPACE_SCREEN_HALF.width, 9);
    expect(SPACE_BILLBOARD.height * SPACE_SCREEN_SCALE).toBeCloseTo(SPACE_SCREEN_HALF.height, 9);
    expect(SPACE_BLOCK_DASHBOARD.width).toBe(SPACE_BILLBOARD.width);
    expect(SPACE_BLOCK_DASHBOARD.height).toBe(SPACE_BILLBOARD.height);
  });

  it("시세는 왼쪽 칸, 네트워크 현황은 오른쪽 칸에 선다", () => {
    const [frameX, frameY, frameZ] = SPACE_SCREEN_FRAME.position;
    const { billboard, blockDashboard } = SPACE_SCREEN_PLACEMENTS;
    const halfOffset = SPACE_SCREEN_HALF.width / 2;

    expect([...billboard.position]).toEqual([frameX - halfOffset, frameY, frameZ]);
    expect([...blockDashboard.position]).toEqual([frameX + halfOffset, frameY, frameZ]);
    expect(billboard.rotationY).toBe(SPACE_SCREEN_FRAME.rotationY);
    expect(blockDashboard.rotationY).toBe(SPACE_SCREEN_FRAME.rotationY);
    expect(billboard.scale).toBe(SPACE_SCREEN_SCALE);
    expect(blockDashboard.scale).toBe(SPACE_SCREEN_SCALE);
  });

  it("바닥 광원이 전광판보다 낮고 홀 쪽에 있다", () => {
    for (const glowPosition of SPACE_SCREEN_GLOW_POSITIONS) {
      expect(glowPosition[1]).toBeLessThan(SPACE_SCREEN_FRAME.position[1]);
      expect(glowPosition[2]).toBeGreaterThan(SPACE_SCREEN_FRAME.position[2]);
    }
  });
});

describe("메뉴판", () => {
  const anchor = findNode("Menu_Anchor");

  it("치수가 GLB `Menu_Anchor` 와 같다", () => {
    expect(anchor.extras?.menu_anchor).toBe(true);
    expect(SPACE_MENU_FRAME.width).toBe(anchor.extras?.width_m);
    expect(SPACE_MENU_FRAME.height).toBe(anchor.extras?.height_m);
  });

  it("앵커 앞 5 cm 에 −Z 방향으로 선다", () => {
    const [x, y, z] = toWorld(anchor.translation);

    expect(SPACE_MENU_FRAME.position[0]).toBeCloseTo(x, 5);
    expect(SPACE_MENU_FRAME.position[1]).toBeCloseTo(y, 5);
    expect(SPACE_MENU_FRAME.position[2]).toBeCloseTo(z - 0.05, 5);
    expect(SPACE_MENU_FRAME.rotationY).toBeCloseTo(Math.PI, 9);
  });
});

describe("램프 자리", () => {
  it("이름 접두사 `Lamp_` 와 `lamp` 표시가 함께 붙어 있다", () => {
    // 이름과 extras 를 함께 보고 찾으므로 규칙이 깨지면 조명이 통째로 꺼진다.
    const lamps = hall.nodes.filter((node) => node.extras?.lamp === true);

    expect(lamps.length).toBeGreaterThan(0);
    expect(lamps.every((node) => node.name.startsWith("Lamp_"))).toBe(true);
  });
});
