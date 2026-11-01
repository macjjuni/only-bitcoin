import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { SPACE_AVATAR, SPACE_MAX_OCCUPANTS } from "@/entities/space";
import { CREW_MODEL, CREW_WALK } from "./crewModel";

/** `docs/btc-space-3d.md` §8 의 예산. 아바타 외 씬은 약 1,000 tri 다. */
const TRIANGLE_BUDGET = 80_000;
/** 아틀라스 한 장을 넘기면 드로우 콜을 더 쓰게 된다. */
const MAXIMUM_IMAGE_COUNT = 1;

interface GltfAccessor {
  count: number;
  min?: number[];
  max?: number[];
}

interface GltfJson {
  meshes: { name: string; primitives: { attributes: Record<string, number>; indices: number }[] }[];
  accessors: GltfAccessor[];
  nodes: { name?: string }[];
  skins?: unknown[];
  animations?: unknown[];
  images?: unknown[];
  samplers?: { magFilter?: number }[];
}

// region [Privates]
/** GLB 의 JSON 청크만 읽는다. three 를 띄우지 않고 규격을 확인하기 위함이다. */
const readGlbJson = (): GltfJson => {
  const buffer = readFileSync(resolve(process.cwd(), "public/models/crew.glb"));

  expect(buffer.readUInt32LE(0)).toBe(0x46546c67);
  const jsonLength = buffer.readUInt32LE(12);

  return JSON.parse(buffer.subarray(20, 20 + jsonLength).toString("utf8")) as GltfJson;
};

const findMesh = (gltf: GltfJson, name: string) => {
  const mesh = gltf.meshes.find((candidate) => candidate.name === name);

  if (!mesh) {
    throw new Error(`crew.glb 에 '${name}' 메시가 없습니다.`);
  }

  return mesh;
};

const countTriangles = (gltf: GltfJson): number => {
  return gltf.meshes.reduce((total, mesh) => {
    return total + mesh.primitives.reduce((sum, p) => sum + gltf.accessors[p.indices].count / 3, 0);
  }, 0);
};
// endregion

/**
 * 모델은 `scripts/blender/process-voxel-crew.py` 가 원본 `voxel-crew.glb` 에서
 * 만든다. 원본은 메시 97개에 스킨·애니메이션이 붙어 있어 그대로 쓸 수 없다.
 * 여기서는 가공 결과가 런타임이 기대하는 규격인지만 고정한다.
 */
describe("크루 모델 규격", () => {
  it("원본의 수십 개 메시가 런타임이 찾는 두 개로 병합돼 있다", () => {
    const gltf = readGlbJson();
    const nodeNames = gltf.nodes.map((node) => node.name);

    // 병합하지 않으면 아바타 한 명이 부위 수만큼 드로우 콜을 쓴다.
    expect(gltf.meshes).toHaveLength(2);
    expect(nodeNames).toContain(CREW_MODEL.bodyMeshName);
    expect(nodeNames).toContain(CREW_MODEL.accentMeshName);
  });

  it("스킨과 애니메이션이 제거돼 있다", () => {
    const gltf = readGlbJson();

    // 스킨드 메시는 인스턴싱이 안 돼 50명이면 드로우 콜 예산을 넘긴다.
    expect(gltf.skins ?? []).toHaveLength(0);
    expect(gltf.animations ?? []).toHaveLength(0);
  });

  it("아틀라스 한 장만 쓰고 확대 필터가 NEAREST 다", () => {
    const gltf = readGlbJson();

    expect(gltf.images ?? []).toHaveLength(MAXIMUM_IMAGE_COUNT);
    // 9728 = NEAREST. LINEAR 로 바뀌면 픽셀 아트가 뭉개진다.
    for (const sampler of gltf.samplers ?? []) {
      expect(sampler.magFilter).toBe(9728);
    }
  });

  it("몸통은 아틀라스를 쓰고 앞판은 단색으로 칠한다", () => {
    const gltf = readGlbJson();
    const body = findMesh(gltf, CREW_MODEL.bodyMeshName).primitives[0];

    // 몸통 배색은 텍스처에 있다. UV 가 없으면 아틀라스를 못 읽는다.
    expect(Object.keys(body.attributes)).toContain("TEXCOORD_0");
    // 여분 UV 셋은 아틀라스 하나만 쓰는 모델에 불필요한 용량이다.
    expect(Object.keys(body.attributes)).not.toContain("TEXCOORD_1");
  });

  it("두 메시 모두 본 번호를 들고 있다", () => {
    const gltf = readGlbJson();

    // 셰이더가 이 번호로 본 행렬 텍스처를 조회한다. 없으면 걷기가 죽는다.
    for (const name of [CREW_MODEL.bodyMeshName, CREW_MODEL.accentMeshName]) {
      for (const primitive of findMesh(gltf, name).primitives) {
        expect(Object.keys(primitive.attributes)).toContain("_BONEINDEX");
      }
    }
  });

  it("Walk 행렬 파일이 셰이더가 기대하는 크기다", () => {
    const buffer = readFileSync(resolve(process.cwd(), "public/models/crew-walk.bin"));
    const expected =
      CREW_WALK.frameCount *
      CREW_WALK.boneCount *
      CREW_WALK.rowsPerBone *
      4 *
      Float32Array.BYTES_PER_ELEMENT;

    // 크기가 어긋나면 셰이더가 엉뚱한 텍셀을 읽어 아바타가 터진다.
    expect(buffer.byteLength).toBe(expected);
  });

  it("50명이 삼각형 예산 안에 들어온다", () => {
    const triangles = countTriangles(readGlbJson());

    expect(triangles * SPACE_MAX_OCCUPANTS).toBeLessThanOrEqual(TRIANGLE_BUDGET);
  });

  it("발바닥이 원점이고 키가 상수와 일치한다", () => {
    const gltf = readGlbJson();
    const body = findMesh(gltf, CREW_MODEL.bodyMeshName).primitives[0];
    const position = gltf.accessors[body.attributes.POSITION];
    const [, minY] = position.min ?? [];
    const [, maxY] = position.max ?? [];

    // 발바닥이 원점이라 아바타를 (x, 0, z) 에 그대로 둔다.
    expect(minY).toBeCloseTo(0, 4);
    expect(maxY).toBeCloseTo(CREW_MODEL.height, 3);
    expect(CREW_MODEL.height).toBe(SPACE_AVATAR.height);
  });

  it("전방이 -Z 라 yaw 를 그대로 쓸 수 있다", () => {
    const gltf = readGlbJson();
    const body = findMesh(gltf, CREW_MODEL.bodyMeshName).primitives[0];
    const position = gltf.accessors[body.attributes.POSITION];
    const minZ = (position.min ?? [])[2] ?? 0;
    const maxZ = (position.max ?? [])[2] ?? 0;

    // 원본은 +Z 를 본다. 가공에서 돌리지 않으면 아바타가 등을 보인 채 걷는다.
    expect(Math.abs(minZ)).toBeGreaterThan(Math.abs(maxZ));
  });

  it("명찰 기준점이 모델 머리 높이 안에 있다", () => {
    const gltf = readGlbJson();
    const body = findMesh(gltf, CREW_MODEL.bodyMeshName).primitives[0];
    const maxY = (gltf.accessors[body.attributes.POSITION].max ?? [])[1] ?? 0;

    // 모델을 바꾸면 가공 스크립트의 [anchor] 값을 SPACE_AVATAR 에 옮겨 적어야 한다.
    expect(SPACE_AVATAR.headCenterY).toBeLessThan(maxY);
    expect(SPACE_AVATAR.headCenterY).toBeGreaterThan(maxY * 0.7);
  });

  it("앞치마 앞판이 몸 앞쪽 허리 아래에 있다", () => {
    const gltf = readGlbJson();
    const accent = findMesh(gltf, CREW_MODEL.accentMeshName).primitives[0];
    const position = gltf.accessors[accent.attributes.POSITION];
    const maxZ = (position.max ?? [])[2] ?? 0;
    const maxY = (position.max ?? [])[1] ?? 0;

    // 앞판이 뒤로 가면 플레이어 색이 정면에서 보이지 않는다.
    expect(maxZ).toBeLessThan(0);
    expect(maxY).toBeLessThan(SPACE_AVATAR.headCenterY);
  });
});
