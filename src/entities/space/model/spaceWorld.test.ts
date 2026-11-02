import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  SPACE_BILLBOARD,
  SPACE_BLOCK_DASHBOARD,
  SPACE_BOUNDS,
  SPACE_CAMERA_BOUNDS,
  SPACE_ISLAND,
  SPACE_MAX_ALTITUDE,
  SPACE_SCREEN_FRAME,
  SPACE_SCREEN_GLOW_POSITIONS,
  SPACE_SCREEN_PLACEMENTS,
  SPACE_SCREEN_SCALE,
  SPACE_SPAWN_FACING,
  SPACE_SPAWN_RING,
} from "@/entities/space";

/**
 * 월드 상수를 **맵 GLB 와 맞춰 둔다.**
 *
 * `spaceWorld.ts` 의 좌표는 전부 `bitcoin_island_draco.glb` 에서 읽은 값이다.
 * 맵을 다시 구우면 조용히 어긋나는데, 어긋난 결과가 "전광판이 액자 옆에 떠
 * 있다" 처럼 **화면을 봐야만 보이는** 종류라 눈으로 잡기 어렵다.
 *
 * GLB 는 Draco 로 압축돼 있지만 **JSON 청크는 평문**이다. 노드 좌표와
 * 액세서의 `min`/`max` 가 거기 들어 있어서, 디코더 없이도 필요한 값은 전부
 * 읽을 수 있다. 메시 정점까지 보려면 Draco 디코더가 필요한데 여기서 볼 일이
 * 없다.
 */

interface GltfAccessor {
  min: number[];
  max: number[];
}

interface GltfNode {
  name: string;
  translation?: number[];
  extras?: { spawn?: boolean; light_anchor?: boolean; collision?: boolean };
}

interface GltfJson {
  accessors: GltfAccessor[];
  meshes: { name: string; primitives: { attributes: { POSITION: number } }[] }[];
  nodes: GltfNode[];
}

const GLB_JSON_CHUNK_OFFSET = 20;

// region [Privates]
const readIslandGltf = (): GltfJson => {
  const buffer = readFileSync(resolve(process.cwd(), "public/models/bitcoin_island_draco.glb"));
  const jsonLength = buffer.readUInt32LE(12);

  return JSON.parse(
    buffer.subarray(GLB_JSON_CHUNK_OFFSET, GLB_JSON_CHUNK_OFFSET + jsonLength).toString("utf8"),
  ) as GltfJson;
};

const island = readIslandGltf();

const findNode = (name: string): GltfNode => {
  const node = island.nodes.find((candidate) => candidate.name === name);

  if (!node) {
    throw new Error(`맵 GLB 에 '${name}' 노드가 없습니다.`);
  }

  return node;
};

/** 메시 정점의 축 정렬 경계 상자. Draco 로 압축돼도 액세서에 그대로 남는다. */
const readMeshBounds = (name: string): GltfAccessor => {
  const mesh = island.meshes.find((candidate) => candidate.name === name);

  if (!mesh) {
    throw new Error(`맵 GLB 에 '${name}' 메시가 없습니다.`);
  }

  return island.accessors[mesh.primitives[0].attributes.POSITION];
};

/** 쿼드의 중심·폭·높이. 화면 네 점이 한 평면에 있으므로 상자에서 바로 읽는다. */
const readScreenQuad = (name: string) => {
  const { min, max } = readMeshBounds(name);

  return {
    center: [(min[0] + max[0]) / 2, (min[1] + max[1]) / 2, (min[2] + max[2]) / 2] as const,
    width: Math.hypot(max[0] - min[0], max[2] - min[2]),
    height: max[1] - min[1],
  };
};
// endregion

describe("섬의 층 높이", () => {
  it("바다에서 궁전 단까지 순서대로 올라간다", () => {
    expect(SPACE_ISLAND.seaY).toBeLessThan(SPACE_ISLAND.dockY);
    expect(SPACE_ISLAND.dockY).toBeLessThan(SPACE_ISLAND.plazaY);
    expect(SPACE_ISLAND.plazaY).toBeLessThan(SPACE_ISLAND.terraceY);
    expect(SPACE_ISLAND.terraceY).toBeLessThan(SPACE_ISLAND.palaceY);
  });

  it("스폰 노드가 가리키는 높이와 같다", () => {
    expect(findNode("Spawn_Dock").translation?.[1]).toBe(SPACE_ISLAND.dockY);
    expect(findNode("Spawn_Plaza").translation?.[1]).toBe(SPACE_ISLAND.plazaY);
    expect(findNode("Spawn_Palace").translation?.[1]).toBe(SPACE_ISLAND.palaceY);
  });
});

describe("이동 경계", () => {
  it("충돌 메시 전체를 덮는다", () => {
    const { min, max } = readMeshBounds("Collision");

    expect(SPACE_BOUNDS.minX).toBeLessThanOrEqual(min[0]);
    expect(SPACE_BOUNDS.maxX).toBeGreaterThanOrEqual(max[0]);
    expect(SPACE_BOUNDS.minZ).toBeLessThanOrEqual(min[2]);
    expect(SPACE_BOUNDS.maxZ).toBeGreaterThanOrEqual(max[2]);
  });

  it("무지개 다리 끝 스폰 지점까지 담는다", () => {
    // 다리는 +X 로 길게 뻗어 섬 본체보다 훨씬 멀다. 경계를 섬에만 맞추면
    // 다리를 건너는 순간 서버가 이동을 거절한다.
    const [bridgeX, , bridgeZ] = findNode("Spawn_BridgeEnd").translation ?? [];

    expect(bridgeX).toBeGreaterThan(SPACE_BOUNDS.minX);
    expect(bridgeX).toBeLessThan(SPACE_BOUNDS.maxX);
    expect(bridgeZ).toBeGreaterThan(SPACE_BOUNDS.minZ);
    expect(bridgeZ).toBeLessThan(SPACE_BOUNDS.maxZ);
  });

  it("높이 상한이 맵에서 가장 높은 지점보다 위에 있다", () => {
    // 궁전 첨탑 꼭대기까지 덮어야 한다. 그보다 낮으면 정상적인 좌표를 서버가
    // 거절할 수 있고, 지나치게 높으면 위생 검사로서 의미가 없다.
    const { max } = readMeshBounds("Collision");

    expect(SPACE_MAX_ALTITUDE).toBeGreaterThan(max[1]);
    expect(SPACE_MAX_ALTITUDE).toBeLessThan(max[1] * 1.5);
  });

  it("스냅샷 2바이트 높이 칸에 들어간다", () => {
    // 1 cm 정밀도의 `Uint16` 이라 655.35 m 가 한계다.
    expect(SPACE_MAX_ALTITUDE * 100).toBeLessThanOrEqual(0xffff);
  });
});

describe("카메라 범위", () => {
  it("이동 경계보다 넓고 궁전보다 높다", () => {
    const { max } = readMeshBounds("Collision");

    expect(SPACE_CAMERA_BOUNDS.minX).toBeLessThan(SPACE_BOUNDS.minX);
    expect(SPACE_CAMERA_BOUNDS.maxX).toBeGreaterThan(SPACE_BOUNDS.maxX);
    expect(SPACE_CAMERA_BOUNDS.minZ).toBeLessThan(SPACE_BOUNDS.minZ);
    expect(SPACE_CAMERA_BOUNDS.maxZ).toBeGreaterThan(SPACE_BOUNDS.maxZ);
    expect(SPACE_CAMERA_BOUNDS.maxY).toBeGreaterThan(max[1]);
  });
});

describe("스폰 링", () => {
  it("광장 한가운데에 있고 원형극장 계단에 닿지 않는다", () => {
    // 원형극장 아랫단이 중심에서 12 m 다. 서버에는 지형이 없어 링 안에서
    // 그대로 세우므로, 계단에 걸치면 접속하자마자 턱에 끼인다.
    expect(SPACE_SPAWN_RING.centerX).toBe(0);
    expect(SPACE_SPAWN_RING.centerZ).toBe(0);
    expect(SPACE_SPAWN_RING.minRadius).toBeGreaterThan(0);
    expect(SPACE_SPAWN_RING.maxRadius).toBeLessThan(12);
  });

  it("광장 바닥 높이에서 시작한다", () => {
    expect(SPACE_SPAWN_RING.y).toBe(SPACE_ISLAND.plazaY);
  });

  it("궁전 스폰 지점을 바라보게 되어 있다", () => {
    expect([...SPACE_SPAWN_FACING]).toEqual(findNode("Spawn_Palace").translation);
  });
});

describe("전광판 액자", () => {
  it("표시 영역 치수가 GLB 쿼드와 같다", () => {
    const quad = readScreenQuad("Screen_BTCUSD");

    expect(quad.width).toBeCloseTo(SPACE_SCREEN_FRAME.width, 3);
    expect(quad.height).toBeCloseTo(SPACE_SCREEN_FRAME.height, 3);
  });

  it("두 패널의 위치가 GLB 쿼드 중심과 같다", () => {
    expect([...SPACE_SCREEN_PLACEMENTS.billboard.position]).toEqual(
      readScreenQuad("Screen_BTCUSD").center.map((value) => expect.closeTo(value, 5)),
    );
    expect([...SPACE_SCREEN_PLACEMENTS.blockDashboard.position]).toEqual(
      readScreenQuad("Screen_Network").center.map((value) => expect.closeTo(value, 5)),
    );
  });

  it("두 패널이 광장 중심을 바라본다", () => {
    // 기본 법선 +Z 인 평면을 Y축으로 θ 돌리면 법선이 (sin θ, 0, cos θ) 다.
    // 그 방향이 패널에서 광장 중심을 향해야 한다.
    for (const placement of Object.values(SPACE_SCREEN_PLACEMENTS)) {
      const [x, , z] = placement.position;
      const toCenter = Math.hypot(x, z);

      expect(Math.sin(placement.rotationY)).toBeCloseTo(-x / toCenter, 3);
      expect(Math.cos(placement.rotationY)).toBeCloseTo(-z / toCenter, 3);
    }
  });

  it("두 액자가 광장 중심선을 기준으로 좌우 대칭이다", () => {
    const [billboardX, billboardY, billboardZ] = SPACE_SCREEN_PLACEMENTS.billboard.position;
    const [dashboardX, dashboardY, dashboardZ] = SPACE_SCREEN_PLACEMENTS.blockDashboard.position;

    expect(dashboardX).toBeCloseTo(-billboardX, 6);
    expect(dashboardY).toBe(billboardY);
    expect(dashboardZ).toBeCloseTo(billboardZ, 6);
  });

  it("축소한 패널이 액자 안쪽 홈을 넘지 않는다", () => {
    // 넘으면 금장 베벨 위로 글자가 올라타 잘려 보인다.
    expect(SPACE_BILLBOARD.height * SPACE_SCREEN_SCALE).toBeCloseTo(SPACE_SCREEN_FRAME.height, 6);
    expect(SPACE_BILLBOARD.width * SPACE_SCREEN_SCALE).toBeLessThanOrEqual(
      SPACE_SCREEN_FRAME.width,
    );
  });

  it("두 패널이 같은 규격이라 한쪽이 보조처럼 보이지 않는다", () => {
    expect(SPACE_BLOCK_DASHBOARD.width).toBe(SPACE_BILLBOARD.width);
    expect(SPACE_BLOCK_DASHBOARD.height).toBe(SPACE_BILLBOARD.height);
  });

  it("바닥 광원이 패널보다 낮고 광장 안쪽에 있다", () => {
    SPACE_SCREEN_GLOW_POSITIONS.forEach((glowPosition, index) => {
      const panel =
        index === 0
          ? SPACE_SCREEN_PLACEMENTS.billboard.position
          : SPACE_SCREEN_PLACEMENTS.blockDashboard.position;

      expect(glowPosition[1]).toBeLessThan(panel[1]);
      // 패널보다 중심에 가깝다. 뒤에 두면 액자 뒷면만 비춘다.
      expect(Math.hypot(glowPosition[0], glowPosition[2])).toBeLessThan(
        Math.hypot(panel[0], panel[2]),
      );
    });
  });
});

describe("랜턴 자리", () => {
  it("맵이 가진 20곳을 그대로 쓴다", () => {
    const anchors = island.nodes.filter((node) => node.extras?.light_anchor === true);

    expect(anchors).toHaveLength(20);
    // 이름 접두사로 찾으므로 규칙이 깨지면 조명이 통째로 꺼진다.
    expect(anchors.every((node) => node.name.startsWith("Light_Lantern_"))).toBe(true);
  });
});
