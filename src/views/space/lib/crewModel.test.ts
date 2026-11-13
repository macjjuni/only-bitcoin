import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  SPACE_AVATAR,
  SPACE_AVATAR_MODELS,
  SPACE_MAX_OCCUPANTS,
  type SpaceAvatarModel,
} from "@/entities/space";
import { CREW_CLIPS, CREW_MODEL } from "./crewModel";

/**
 * `docs/btc-space-3d.md` §8 의 예산. 아바타 외 씬은 약 1,750 tri 임.
 *
 * 예산은 **측정값이 아니라 설계 가정**이고(§8.2 미측정), 실질 병목인 드로우 콜은
 * 모델 종류 수만큼만 늚(종류당 몸통·색 띠·눈 3개). 175k 는 모델 하나가 3,500 tri 를
 * 넘기면 깨지는 선이라, 다음 모델이 더 무거우면 이 테스트가 알려 줌.
 */
const TRIANGLE_BUDGET = 175_000;
/** 아틀라스 1장. 눈은 텍스처 없이 발광 재질만 씀. */
const MAXIMUM_IMAGE_COUNT = 1;
const NEAREST_FILTER = 9728;

interface GltfAccessor {
  count: number;
  min?: number[];
  max?: number[];
}

interface GltfJson {
  meshes: {
    name: string;
    primitives: { attributes: Record<string, number>; indices: number; material: number }[];
  }[];
  accessors: GltfAccessor[];
  nodes: { name?: string }[];
  materials: {
    name: string;
    emissiveFactor?: number[];
    pbrMetallicRoughness?: { baseColorTexture?: { index: number } };
  }[];
  skins?: unknown[];
  animations?: unknown[];
  images?: { name?: string }[];
  samplers?: { magFilter?: number }[];
}

// region [Privates]
/** GLB 의 JSON 청크만 읽음. three 를 띄우지 않고 규격을 확인하기 위함임. */
const readGlbJson = (modelUrl: string): GltfJson => {
  const buffer = readFileSync(resolve(process.cwd(), `public${modelUrl}`));

  expect(buffer.readUInt32LE(0)).toBe(0x46546c67);
  const jsonLength = buffer.readUInt32LE(12);

  return JSON.parse(buffer.subarray(20, 20 + jsonLength).toString("utf8")) as GltfJson;
};

const findMesh = (gltf: GltfJson, name: string) => {
  const mesh = gltf.meshes.find((candidate) => candidate.name === name);

  if (!mesh) {
    throw new Error(`glb 에 '${name}' 메시가 없습니다.`);
  }

  return mesh;
};

/** 모델 하나의 메시 이름 목록. 눈 메시가 없는 모델은 두 개임. */
const meshNamesOf = (model: SpaceAvatarModel): string[] => {
  return [model.bodyMeshName, model.accentMeshName, model.pupilGlintMeshName].filter(
    (name): name is string => name !== null,
  );
};

const countTriangles = (gltf: GltfJson): number => {
  return gltf.meshes.reduce((total, mesh) => {
    return total + mesh.primitives.reduce((sum, p) => sum + gltf.accessors[p.indices].count / 3, 0);
  }, 0);
};

const readBounds = (gltf: GltfJson, meshName: string): { min: number[]; max: number[] } => {
  const { attributes } = findMesh(gltf, meshName).primitives[0];
  const position = gltf.accessors[attributes.POSITION];

  return { min: position.min ?? [], max: position.max ?? [] };
};
// endregion

/**
 * 모든 모델에 적용되는 규격.
 *
 * 모델은 `scripts/bake-avatar.mjs` 가 리깅된 원본에서 구움. 여기서는 구운 결과가
 * 런타임이 기대하는 규격인지만 고정함. 모델을 추가하면 이 블록이 자동으로 검사함.
 */
describe.each(
  SPACE_AVATAR_MODELS.map((model) => [model.id, model] as const),
)("아바타 모델 규격 — %s", (_id, model) => {
  const gltf = readGlbJson(model.modelUrl);

  it("메시가 병합돼 있고 이름이 상수와 맞는다", () => {
    expect(gltf.meshes.map((mesh) => mesh.name).sort()).toEqual(meshNamesOf(model).sort());
    expect(gltf.nodes.map((node) => node.name).sort()).toEqual(meshNamesOf(model).sort());
  });

  it("스킨과 애니메이션이 제거돼 있다", () => {
    // 스킨이 남아 있으면 three 가 SkinnedMesh 로 읽어 InstancedMesh 에 못 얹음.
    expect(gltf.skins ?? []).toHaveLength(0);
    expect(gltf.animations ?? []).toHaveLength(0);
  });

  it("메시마다 primitive 가 하나뿐이다", () => {
    // 여러 개면 로더가 Group 으로 읽어 지오메트리를 바로 못 꺼냄.
    for (const name of meshNamesOf(model)) {
      expect(findMesh(gltf, name).primitives, name).toHaveLength(1);
    }
  });

  it("모든 메시가 본 번호를 들고 있다", () => {
    // 없으면 셰이더가 0번 본만 읽어 모션이 조용히 죽음.
    const attributeName = CREW_MODEL.boneIndexAttribute.toUpperCase();

    for (const name of meshNamesOf(model)) {
      expect(Object.keys(findMesh(gltf, name).primitives[0].attributes), name).toContain(
        attributeName,
      );
    }
  });

  it("모션 행렬 파일이 셰이더가 기대하는 크기다", () => {
    const clips = readFileSync(resolve(process.cwd(), `public${model.clipsUrl}`));
    // 본 칸 × 행 3개 × RGBA 4채널 × 반정밀도 2바이트.
    const bytesPerFrame = CREW_CLIPS.boneCount * CREW_CLIPS.rowsPerBone * 4 * 2;

    expect(clips.byteLength).toBe(model.clipFrameCount * bytesPerFrame);
  });

  it("삼각형 수가 상수와 맞고 50명이 예산 안에 들어온다", () => {
    const triangles = countTriangles(gltf);

    expect(triangles).toBe(model.triangleCount);
    expect(triangles * SPACE_MAX_OCCUPANTS).toBeLessThanOrEqual(TRIANGLE_BUDGET);
  });

  it("발바닥이 원점이고 키가 상수와 일치한다", () => {
    const { min, max } = readBounds(gltf, model.bodyMeshName);

    // 발바닥이 원점이라 아바타를 (x, 0, z) 에 그대로 둠.
    expect(min[1]).toBeCloseTo(0, 3);
    expect(max[1]).toBeCloseTo(model.height, 2);
  });

  it("전방이 -Z 라 yaw 를 그대로 쓸 수 있다", () => {
    // 원본은 +Z 를 봄. 구울 때 돌리지 않으면 아바타가 등을 보인 채 걸음.
    // 손에 든 방망이가 앞으로 뻗어 있어 몸통이 앞(−Z)으로 더 나와 있음.
    const { min, max } = readBounds(gltf, model.bodyMeshName);

    expect(Math.abs(min[2])).toBeGreaterThan(Math.abs(max[2]));

    if (model.pupilGlintMeshName) {
      // 눈은 얼굴 앞면에 있음.
      expect(readBounds(gltf, model.pupilGlintMeshName).max[2]).toBeLessThan(0);
    }
  });

  it("명찰 기준점이 모델 머리 높이 안에 있다", () => {
    const { max } = readBounds(gltf, model.bodyMeshName);

    expect(model.headCenterY).toBeLessThan(max[1]);
    expect(model.headCenterY).toBeGreaterThan(max[1] * 0.7);
  });

  it("플레이어 색을 받는 부위가 머리 아래 몸통에 있다", () => {
    const { min, max } = readBounds(gltf, model.accentMeshName);

    expect(max[1]).toBeLessThan(model.headCenterY);
    expect(min[1]).toBeGreaterThan(0.3);
  });

  it("몸통은 아틀라스를 쓰고 색 띠는 텍스처 없이 단색으로 칠한다", () => {
    const body = findMesh(gltf, model.bodyMeshName).primitives[0];
    const accent = findMesh(gltf, model.accentMeshName).primitives[0];

    expect(gltf.materials[body.material].pbrMetallicRoughness?.baseColorTexture).toBeDefined();
    // 텍스처가 있으면 플레이어 색이 그 위에 곱해져 탁해짐.
    expect(gltf.materials[accent.material].pbrMetallicRoughness?.baseColorTexture).toBeUndefined();
  });

  it("아틀라스를 픽셀 필터로 쓰고 이미지가 한 장뿐이다", () => {
    // 선형 필터면 픽셀 아트가 뭉개짐.
    expect(gltf.images ?? []).toHaveLength(MAXIMUM_IMAGE_COUNT);
    for (const sampler of gltf.samplers ?? []) {
      expect(sampler.magFilter).toBe(NEAREST_FILTER);
    }
  });

  it("눈은 발광 재질이다", () => {
    if (!model.pupilGlintMeshName) {
      return;
    }
    const eyes = findMesh(gltf, model.pupilGlintMeshName).primitives[0];
    const emissive = gltf.materials[eyes.material].emissiveFactor ?? [0, 0, 0];

    expect(Math.max(...emissive)).toBeGreaterThan(0.5);
  });
});

describe("아바타 공통 치수", () => {
  it("기본 키가 아바타 치수 상수와 같다", () => {
    expect(CREW_MODEL.height).toBe(SPACE_AVATAR.height);
  });

  it("모든 모델의 키가 기본 키 근처다", () => {
    // 카메라 주시점·충돌 캡슐·그림자가 기본 키 기준이라 크게 다르면 어긋나 보임.
    for (const model of SPACE_AVATAR_MODELS) {
      expect(Math.abs(model.height - SPACE_AVATAR.height)).toBeLessThan(0.25);
    }
  });
});
