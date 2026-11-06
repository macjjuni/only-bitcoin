import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  SPACE_AVATAR,
  SPACE_AVATAR_MODELS,
  SPACE_MAX_OCCUPANTS,
  type SpaceAvatarModel,
} from "@/entities/space";
import { CREW_KICK, CREW_MODEL, CREW_WALK } from "./crewModel";

const CREW = SPACE_AVATAR_MODELS[0];

/**
 * `docs/btc-space-3d.md` §8 의 예산. 아바타 외 씬은 약 1,750 tri 임.
 *
 * 80k → 110k(황소 1,972 tri) → 165k(머슼크 3,202 tri × 50 = 160,100)
 * → 175k(세일러문 3,392 tri × 50 = 169,600)로 올렸음.
 * 근거는 §8. 요약하면 예산은 **측정값이 아니라 설계 가정**이고(§8.2 미측정), 실질
 * 병목인 드로우 콜은 모델 7종 최악에도 30개(렌치 포함)로 예산(50) 안임. 머슼크는 머리가
 * 1,434 tri 통짜 조각이라 겉모습을 안 바꾸고 줄일 수 있는 게 3,052 까지였음.
 *
 * 165k → 175k 는 세일러문 갱신본이 머리·수염 디테일을 늘리며(면 938 → 1,696)
 * 3,392 tri 가 된 것을 받은 값임. 모델이 하나 늘어도 드로우 콜은 모델 종류 수만큼만
 * 늘고(종류당 몸통·앞판·눈동자·무기 4개), 한 사람이 쓰는 모델은 하나임.
 *
 * 상한은 남김. 175k 는 모델 하나가 3,500 tri 를 넘기면 깨지는 선이라, 다음 모델이
 * 더 무거우면 이 테스트가 알려 줌.
 */
const TRIANGLE_BUDGET = 175_000;
/** 아틀라스 1장과 검은 눈동자의 색·발광 마스크 2장. */
const MAXIMUM_IMAGE_COUNT = 3;

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
    emissiveTexture?: { index: number };
    pbrMetallicRoughness?: { baseColorTexture?: { index: number } };
  }[];
  skins?: unknown[];
  animations?: unknown[];
  images?: { name?: string }[];
  textures?: { source: number }[];
  samplers?: { magFilter?: number }[];
}

// region [Privates]
/** GLB 의 JSON 청크만 읽음. three 를 띄우지 않고 규격을 확인하기 위함임. */
const readGlbJson = (modelUrl: string = CREW.modelUrl): GltfJson => {
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

/** 모델 하나의 메시 이름 목록. 글린트가 없는 모델(곰)은 두 개임. */
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
// endregion

/**
 * 모델은 `scripts/blender/process-voxel-character.py` 가 원본 `voxel-crew.glb` 에서
 * 만듦. 원본은 메시 97개에 스킨·애니메이션이 붙어 있어 그대로 쓸 수 없음.
 * 여기서는 가공 결과가 런타임이 기대하는 규격인지만 고정함.
 */
describe("크루 모델 규격", () => {
  it("흰자는 몸통에 남기고 눈동자만 별도 메시로 분리한다", () => {
    const gltf = readGlbJson();
    const nodeNames = gltf.nodes.map((node) => node.name);

    // 병합하지 않으면 아바타 한 명이 부위 수만큼 드로우 콜을 씀.
    expect(gltf.meshes).toHaveLength(3);
    expect(nodeNames).toContain(CREW.bodyMeshName);
    expect(nodeNames).toContain(CREW.accentMeshName);
    expect(nodeNames).toContain(CREW.pupilGlintMeshName as string);
  });

  it("검은 눈동자 중앙에만 약한 붉은 발광 마스크를 쓴다", () => {
    const gltf = readGlbJson();
    const body = findMesh(gltf, CREW.bodyMeshName).primitives[0];
    const pupil = findMesh(gltf, CREW.pupilGlintMeshName as string).primitives[0];
    const pupilMaterial = gltf.materials[pupil.material];

    expect(gltf.accessors[pupil.indices].count).toBe(24 * 3);
    expect(gltf.accessors[body.indices].count).toBe(1192 * 3);
    expect(gltf.materials[body.material].name).toBe("Crew_Pixel_PBR");
    expect(pupilMaterial.name).toBe("Subtle_Red_Pupil");
    expect(pupilMaterial.emissiveFactor?.[0]).toBeCloseTo(0.45, 2);
    expect(
      gltf.images?.[gltf.textures?.[pupilMaterial.emissiveTexture?.index ?? -1]?.source ?? -1]
        ?.name,
    ).toBe("laser-pupil-soft-emission");
    expect(
      gltf.images?.[
        gltf.textures?.[pupilMaterial.pbrMetallicRoughness?.baseColorTexture?.index ?? -1]
          ?.source ?? -1
      ]?.name,
    ).toBe("laser-pupil-soft-color");
  });

  it("스킨과 애니메이션이 제거돼 있다", () => {
    const gltf = readGlbJson();

    // 스킨드 메시는 인스턴싱이 안 돼 50명이면 드로우 콜 예산을 넘김.
    expect(gltf.skins ?? []).toHaveLength(0);
    expect(gltf.animations ?? []).toHaveLength(0);
  });

  it("아틀라스와 눈동자 텍스처를 픽셀 필터로 쓴다", () => {
    const gltf = readGlbJson();

    expect(gltf.images ?? []).toHaveLength(MAXIMUM_IMAGE_COUNT);
    // 9728 = NEAREST. LINEAR 로 바뀌면 픽셀 아트가 뭉개짐.
    for (const sampler of gltf.samplers ?? []) {
      expect(sampler.magFilter).toBe(9728);
    }
  });

  it("몸통은 아틀라스를 쓰고 앞판은 단색으로 칠한다", () => {
    const gltf = readGlbJson();
    const body = findMesh(gltf, CREW.bodyMeshName).primitives[0];

    // 몸통 배색은 텍스처에 있음. UV 가 없으면 아틀라스를 못 읽음.
    expect(Object.keys(body.attributes)).toContain("TEXCOORD_0");
    // 여분 UV 셋은 아틀라스 하나만 쓰는 모델에 불필요한 용량임.
    expect(Object.keys(body.attributes)).not.toContain("TEXCOORD_1");
  });

  it("50명이 삼각형 예산 안에 들어온다", () => {
    const triangles = countTriangles(readGlbJson());

    expect(triangles * SPACE_MAX_OCCUPANTS).toBeLessThanOrEqual(TRIANGLE_BUDGET);
  });

  it("발바닥이 원점이고 키가 상수와 일치한다", () => {
    const gltf = readGlbJson();
    const body = findMesh(gltf, CREW.bodyMeshName).primitives[0];
    const position = gltf.accessors[body.attributes.POSITION];
    const [, minY] = position.min ?? [];
    const [, maxY] = position.max ?? [];

    // 발바닥이 원점이라 아바타를 (x, 0, z) 에 그대로 둠.
    expect(minY).toBeCloseTo(0, 4);
    expect(maxY).toBeCloseTo(CREW_MODEL.height, 3);
    expect(CREW_MODEL.height).toBe(SPACE_AVATAR.height);
  });

  it("전방이 -Z 라 yaw 를 그대로 쓸 수 있다", () => {
    const gltf = readGlbJson();
    const body = findMesh(gltf, CREW.bodyMeshName).primitives[0];
    const position = gltf.accessors[body.attributes.POSITION];
    const minZ = (position.min ?? [])[2] ?? 0;
    const maxZ = (position.max ?? [])[2] ?? 0;

    // 원본은 +Z 를 봄. 가공에서 돌리지 않으면 아바타가 등을 보인 채 걸음.
    expect(Math.abs(minZ)).toBeGreaterThan(Math.abs(maxZ));
  });

  it("명찰 기준점이 모델 머리 높이 안에 있다", () => {
    const gltf = readGlbJson();
    const body = findMesh(gltf, CREW.bodyMeshName).primitives[0];
    const maxY = (gltf.accessors[body.attributes.POSITION].max ?? [])[1] ?? 0;

    // 모델을 바꾸면 가공 스크립트의 [anchor] 값을 SPACE_AVATAR 에 옮겨 적어야 함.
    expect(SPACE_AVATAR.headCenterY).toBeLessThan(maxY);
    expect(SPACE_AVATAR.headCenterY).toBeGreaterThan(maxY * 0.7);
  });

  it("앞치마 앞판이 몸 앞쪽 허리 아래에 있다", () => {
    const gltf = readGlbJson();
    const accent = findMesh(gltf, CREW.accentMeshName).primitives[0];
    const position = gltf.accessors[accent.attributes.POSITION];
    const maxZ = (position.max ?? [])[2] ?? 0;
    const maxY = (position.max ?? [])[1] ?? 0;

    // 앞판이 뒤로 가면 플레이어 색이 정면에서 보이지 않음.
    expect(maxZ).toBeLessThan(0);
    expect(maxY).toBeLessThan(SPACE_AVATAR.headCenterY);
  });
});

/**
 * 고를 수 있는 모든 모델에 적용되는 규격.
 *
 * 두 모델이 같은 셰이더·같은 걷기 상수를 쓰므로, 한쪽만 규격을 어겨도 그 모델을
 * 고른 사람의 아바타가 조용히 터짐. 모델을 추가하면 이 블록이 자동으로 검사함.
 */
describe.each(
  SPACE_AVATAR_MODELS.map((model) => [model.id, model] as const),
)("아바타 모델 규격 — %s", (_id, model) => {
  it("메시가 병합돼 있고 이름이 상수와 맞는다", () => {
    const gltf = readGlbJson(model.modelUrl);
    const nodeNames = gltf.nodes.map((node) => node.name);
    const expectedNames = meshNamesOf(model);

    // 병합하지 않으면 아바타 한 명이 부위 수만큼 드로우 콜을 씀.
    expect(gltf.meshes).toHaveLength(expectedNames.length);
    for (const name of expectedNames) {
      expect(nodeNames).toContain(name);
    }
  });

  it("스킨과 애니메이션이 제거돼 있다", () => {
    const gltf = readGlbJson(model.modelUrl);

    expect(gltf.skins ?? []).toHaveLength(0);
    expect(gltf.animations ?? []).toHaveLength(0);
  });

  it("메시마다 primitive 가 하나뿐이다", () => {
    /*
     * glTF 는 재질마다 primitive 를 쪼개고, three 는 primitive 가 둘 이상인
     * 메시를 **Mesh 가 아니라 Group** 으로 만듦. 런타임은 Mesh 를 찾아
     * 인스턴싱하므로 Group 이 오면 "메시가 없습니다" 로 터짐.
     * (황소의 금색 단추 재질이 이 경우였음 — 같은 아틀라스를 쓰고 metallic 만
     * 달라, 가공 스크립트가 재질을 하나로 합치게 했음.)
     */
    const gltf = readGlbJson(model.modelUrl);

    for (const name of meshNamesOf(model)) {
      expect(findMesh(gltf, name).primitives).toHaveLength(1);
    }
  });

  it("모든 메시가 본 번호를 들고 있다", () => {
    const gltf = readGlbJson(model.modelUrl);

    // 셰이더가 이 번호로 본 행렬 텍스처를 조회함. 없으면 걷기가 죽음.
    for (const name of meshNamesOf(model)) {
      for (const primitive of findMesh(gltf, name).primitives) {
        expect(Object.keys(primitive.attributes)).toContain("_BONEINDEX");
      }
    }
  });

  it("Walk 행렬 파일이 셰이더가 기대하는 크기다", () => {
    const buffer = readFileSync(resolve(process.cwd(), `public${model.walkUrl}`));
    const expected =
      model.walkFrameCount *
      CREW_WALK.boneCount *
      CREW_WALK.rowsPerBone *
      4 *
      Float32Array.BYTES_PER_ELEMENT;

    // 크기가 어긋나면 셰이더가 엉뚱한 텍셀을 읽어 아바타가 터짐.
    expect(buffer.byteLength).toBe(expected);
  });

  it("발차기 행렬 파일이 셰이더가 기대하는 크기이고 첫·끝 프레임이 레스트 포즈임", () => {
    const buffer = readFileSync(resolve(process.cwd(), `public${model.kickUrl}`));
    const floatsPerFrame = CREW_WALK.boneCount * CREW_WALK.rowsPerBone * 4;

    expect(buffer.byteLength).toBe(
      CREW_KICK.frameCount * floatsPerFrame * Float32Array.BYTES_PER_ELEMENT,
    );

    // 첫·끝이 레스트(단위 행렬)라야 걷기에서 넘어가고 돌아올 때 안 튐.
    const data = new Float32Array(buffer.buffer, buffer.byteOffset, buffer.byteLength / 4);
    const identityRow = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0];
    for (const frame of [0, CREW_KICK.frameCount - 1]) {
      for (let bone = 0; bone < CREW_WALK.boneCount; bone += 1) {
        const start = frame * floatsPerFrame + bone * 12;
        const row = Array.from(data.slice(start, start + 12));
        row.forEach((value, index) => {
          expect(value).toBeCloseTo(identityRow[index], 4);
        });
      }
    }
  });

  it("삼각형 수가 상수와 맞고 50명이 예산 안에 들어온다", () => {
    const triangles = countTriangles(readGlbJson(model.modelUrl));

    expect(triangles).toBe(model.triangleCount);
    expect(triangles * SPACE_MAX_OCCUPANTS).toBeLessThanOrEqual(TRIANGLE_BUDGET);
  });

  it("발바닥이 원점이고 키가 상수와 일치한다", () => {
    const gltf = readGlbJson(model.modelUrl);
    const body = findMesh(gltf, model.bodyMeshName).primitives[0];
    const position = gltf.accessors[body.attributes.POSITION];
    const [, minY] = position.min ?? [];
    const [, maxY] = position.max ?? [];

    expect(minY).toBeCloseTo(0, 2);
    expect((maxY ?? 0) - (minY ?? 0)).toBeCloseTo(model.height, 2);
  });
});
