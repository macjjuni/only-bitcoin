import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { SPACE_AVATAR_MODELS } from "@/entities/space";
import { CREW_WALK } from "./crewModel";

/**
 * 셰이더가 읽는 자료를 같은 방식으로 풀어 본다.
 *
 * 걷기가 죽어도 화면은 멀쩡히 서 있는 아바타를 보여 줘서 조용히 넘어간다.
 * 행렬 배치·전치·본 번호 중 하나만 어긋나도 여기서 걸리게 한다.
 */

interface Chunks {
  json: {
    meshes: {
      name: string;
      primitives: { attributes: Record<string, number>; indices: number }[];
    }[];
    accessors: {
      bufferView: number;
      byteOffset?: number;
      count: number;
      type: string;
      componentType: number;
    }[];
    bufferViews: { byteOffset?: number; byteLength: number; byteStride?: number }[];
  };
  bin: Buffer;
}

// region [Privates]
const readGlb = (): Chunks => {
  const buffer = readFileSync(resolve(process.cwd(), "public/models/crew.glb"));
  const jsonLength = buffer.readUInt32LE(12);
  const json = JSON.parse(buffer.subarray(20, 20 + jsonLength).toString("utf8"));
  const binLength = buffer.readUInt32LE(20 + jsonLength);
  const binStart = 20 + jsonLength + 8;

  return { json, bin: buffer.subarray(binStart, binStart + binLength) };
};

const COMPONENT_SIZE: Record<number, number> = { 5126: 4, 5125: 4, 5123: 2, 5121: 1 };
const COMPONENT_COUNT: Record<string, number> = { SCALAR: 1, VEC2: 2, VEC3: 3, VEC4: 4 };

const readAccessor = ({ json, bin }: Chunks, index: number): number[][] => {
  const accessor = json.accessors[index];
  const view = json.bufferViews[accessor.bufferView];
  const count = COMPONENT_COUNT[accessor.type];
  const size = COMPONENT_SIZE[accessor.componentType];
  const start = (view.byteOffset ?? 0) + (accessor.byteOffset ?? 0);
  const stride = view.byteStride ?? count * size;
  const out: number[][] = [];

  for (let i = 0; i < accessor.count; i += 1) {
    const at = start + i * stride;
    out.push(
      Array.from({ length: count }, (_, c) =>
        accessor.componentType === 5126
          ? bin.readFloatLE(at + c * 4)
          : accessor.componentType === 5125
            ? bin.readUInt32LE(at + c * 4)
            : bin.readUInt16LE(at + c * 2),
      ),
    );
  }

  return out;
};

/** 셰이더의 `readBoneMatrix` 와 같은 색인 계산. */
const applyBone = (walk: Float32Array, frame: number, bone: number, point: number[]): number[] => {
  const base = (frame * CREW_WALK.boneCount + bone) * CREW_WALK.rowsPerBone * 4;

  return [0, 1, 2].map((row) => {
    const o = base + row * 4;
    return walk[o] * point[0] + walk[o + 1] * point[1] + walk[o + 2] * point[2] + walk[o + 3];
  });
};
// endregion

describe("Walk 본 행렬", () => {
  const glb = readGlb();
  const walkBuffer = readFileSync(resolve(process.cwd(), "public/models/crew-walk.bin"));
  const walk = new Float32Array(
    walkBuffer.buffer.slice(walkBuffer.byteOffset, walkBuffer.byteOffset + walkBuffer.byteLength),
  );
  const body = glb.json.meshes.find((m) => m.name === SPACE_AVATAR_MODELS[0].bodyMeshName);
  if (!body) {
    throw new Error("crew_body 메시가 없습니다.");
  }
  const positions = readAccessor(glb, body.primitives[0].attributes.POSITION);
  const boneIndexes = readAccessor(glb, body.primitives[0].attributes._BONEINDEX).map(([v]) =>
    Math.round(v),
  );

  it("본 번호가 구운 본 개수 안에 있다", () => {
    const highest = Math.max(...boneIndexes);
    const lowest = Math.min(...boneIndexes);

    expect(lowest).toBeGreaterThanOrEqual(0);
    expect(highest).toBeLessThan(CREW_WALK.boneCount);
    // 한 본에만 몰려 있으면 가공이 잘못돼 전신이 통째로 움직인다.
    expect(new Set(boneIndexes).size).toBeGreaterThan(10);
  });

  it("레스트 프레임이 아니라 실제로 자세가 바뀐다", () => {
    let maximumShift = 0;

    for (let i = 0; i < positions.length; i += 1) {
      const moved = applyBone(walk, 10, boneIndexes[i], positions[i]);
      const shift = Math.hypot(
        moved[0] - positions[i][0],
        moved[1] - positions[i][1],
        moved[2] - positions[i][2],
      );
      maximumShift = Math.max(maximumShift, shift);
    }

    // 행렬이 전부 단위행렬이면(= 베이크 실패) 0 이 나온다.
    expect(maximumShift).toBeGreaterThan(0.1);
  });

  it("발이 사이클 안에서 앞뒤로 움직인다", () => {
    const ankles = positions
      .map((p, i) => ({ p, bone: boneIndexes[i] }))
      .filter(({ p }) => p[1] < 0.12);
    const spreadAt = (frame: number): number => {
      const zs = ankles.map(({ p, bone }) => applyBone(walk, frame, bone, p)[2]);
      return Math.max(...zs) - Math.min(...zs);
    };
    const spreads = [0, 10, 20, 30].map(spreadAt);

    // 걷기면 보폭이 프레임마다 달라진다. 정지 포즈만 구웠다면 전부 같다.
    expect(Math.max(...spreads) - Math.min(...spreads)).toBeGreaterThan(0.05);
  });

  it("사이클 첫 프레임과 끝 프레임이 이어진다", () => {
    const at = (frame: number) =>
      positions.map((p, i) => applyBone(walk, frame, boneIndexes[i], p));
    const first = at(0);
    const last = at(SPACE_AVATAR_MODELS[0].walkFrameCount - 1);
    const gap = Math.max(
      ...first.map((p, i) => Math.hypot(p[0] - last[i][0], p[1] - last[i][1], p[2] - last[i][2])),
    );

    // 끊기면 루프가 돌 때마다 다리가 덜컥거린다.
    expect(gap).toBeLessThan(0.2);
  });
});
