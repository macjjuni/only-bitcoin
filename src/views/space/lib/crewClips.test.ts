import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { DataUtils } from "three";
import { describe, expect, it } from "vitest";
import { SPACE_AVATAR_MODELS, type SpaceAvatarClip, type SpaceAvatarModel } from "@/entities/space";
import { CREW_CLIPS } from "./crewModel";

/**
 * 셰이더가 읽는 자료를 같은 방식으로 풀어 본다.
 *
 * 모션이 죽어도 화면은 멀쩡히 서 있는 아바타를 보여 줘서 조용히 넘어간다. 행렬 배치·
 * 전치·본 번호·모션 표 중 하나만 어긋나도 여기서 걸리게 한다. 정점을 직접 변형해 보고
 * 몸이 터지지 않았는지(바닥을 뚫거나 키가 달라지지 않았는지)까지 본다.
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

interface SkinnedBody {
  positions: number[][];
  boneIndices: number[];
  /** 본 번호별로 그 본에 묶인 정점 번호. */
  verticesByBone: Map<number, number[]>;
}

const COMPONENT_SIZE: Record<number, number> = { 5126: 4, 5125: 4, 5123: 2, 5121: 1 };
const COMPONENT_COUNT: Record<string, number> = { SCALAR: 1, VEC2: 2, VEC3: 3, VEC4: 4 };
const LOOPING_CLIPS: readonly SpaceAvatarClip[] = ["idle", "walk", "run"];

// region [Privates]
const readGlb = (modelUrl: string): Chunks => {
  const buffer = readFileSync(resolve(process.cwd(), `public${modelUrl}`));
  const jsonLength = buffer.readUInt32LE(12);
  const json = JSON.parse(buffer.subarray(20, 20 + jsonLength).toString("utf8"));
  const binLength = buffer.readUInt32LE(20 + jsonLength);
  const binStart = 20 + jsonLength + 8;

  return { json, bin: buffer.subarray(binStart, binStart + binLength) };
};

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

const readBody = (model: SpaceAvatarModel): SkinnedBody => {
  const glb = readGlb(model.modelUrl);
  const mesh = glb.json.meshes.find((candidate) => candidate.name === model.bodyMeshName);

  if (!mesh) {
    throw new Error(`'${model.bodyMeshName}' 메시가 없습니다.`);
  }
  const { attributes } = mesh.primitives[0];
  const positions = readAccessor(glb, attributes.POSITION);
  const boneIndices = readAccessor(glb, attributes._BONEINDEX).map(([bone]) => bone);
  const verticesByBone = new Map<number, number[]>();

  boneIndices.forEach((bone, vertex) => {
    verticesByBone.set(bone, [...(verticesByBone.get(bone) ?? []), vertex]);
  });

  return { positions, boneIndices, verticesByBone };
};

/** 반정밀도로 구운 행렬을 실수로 풂. */
const readClips = (model: SpaceAvatarModel): Float32Array => {
  const bytes = readFileSync(resolve(process.cwd(), `public${model.clipsUrl}`));
  const halves = new Uint16Array(bytes.buffer, bytes.byteOffset, bytes.byteLength / 2);

  return Float32Array.from(halves, (half) => DataUtils.fromHalfFloat(half));
};

/** 셰이더의 `readBoneMatrix` 와 같은 색인 계산. */
const applyBone = (clips: Float32Array, frame: number, bone: number, point: number[]): number[] => {
  const base = (frame * CREW_CLIPS.boneCount + bone) * CREW_CLIPS.rowsPerBone * 4;

  return [0, 1, 2].map((row) => {
    const o = base + row * 4;
    return clips[o] * point[0] + clips[o + 1] * point[1] + clips[o + 2] * point[2] + clips[o + 3];
  });
};

/** 한 프레임에서 모든 정점을 변형해 가장 낮은·높은 높이를 돌려줌. */
const measureHeights = (
  body: SkinnedBody,
  clips: Float32Array,
  frame: number,
): { lowest: number; highest: number } => {
  let lowest = Number.POSITIVE_INFINITY;
  let highest = Number.NEGATIVE_INFINITY;

  body.positions.forEach((point, vertex) => {
    const [, y] = applyBone(clips, frame, body.boneIndices[vertex], point);

    lowest = Math.min(lowest, y);
    highest = Math.max(highest, y);
  });

  return { lowest, highest };
};

/** 발(가장 낮은 정점들이 묶인 본)을 찾아 그 본의 정점 평균 위치를 프레임마다 구함. */
const traceLowestBone = (
  body: SkinnedBody,
  clips: Float32Array,
  model: SpaceAvatarModel,
  clip: SpaceAvatarClip,
): number[][] => {
  const lowestVertex = body.positions.reduce(
    (lowest, point, vertex) => (point[1] < body.positions[lowest][1] ? vertex : lowest),
    0,
  );
  const footVertices = body.verticesByBone.get(body.boneIndices[lowestVertex]) ?? [];
  const { startFrame, frameCount } = model.clips[clip];

  return Array.from({ length: frameCount }, (_, frame) => {
    const sum = [0, 0, 0];

    for (const vertex of footVertices) {
      const moved = applyBone(
        clips,
        startFrame + frame,
        body.boneIndices[vertex],
        body.positions[vertex],
      );

      sum[0] += moved[0];
      sum[1] += moved[1];
      sum[2] += moved[2];
    }

    return sum.map((value) => value / footVertices.length);
  });
};
// endregion

describe.each(
  SPACE_AVATAR_MODELS.map((model) => [model.id, model] as const),
)("모션 본 행렬 — %s", (_id, model) => {
  const body = readBody(model);
  const clips = readClips(model);

  it("본 번호가 구운 본 칸 안에 있다", () => {
    for (const bone of body.verticesByBone.keys()) {
      expect(Number.isInteger(bone)).toBe(true);
      expect(bone).toBeGreaterThanOrEqual(0);
      expect(bone).toBeLessThan(CREW_CLIPS.boneCount);
    }
  });

  it("어느 모션의 어느 프레임에서도 몸이 터지지 않는다", () => {
    // 행렬 배치나 본 번호가 어긋나면 정점이 엉뚱한 본을 따라가 바닥 밑이나 하늘로 날아감.
    for (const [clip, range] of Object.entries(model.clips)) {
      for (let frame = 0; frame < range.frameCount; frame += 1) {
        const { lowest, highest } = measureHeights(body, clips, range.startFrame + frame);
        const label = `${clip} ${frame}프레임`;

        // 바닥을 살짝 스치는 것(반정밀도 오차, 발끝 회전)까지만 봐줌.
        expect(lowest, label).toBeGreaterThan(-0.05);
        expect(lowest, label).toBeLessThan(0.25);
        expect(highest, label).toBeLessThan(model.height * 1.25);
      }
    }
  });

  it("서 있는 모션은 키가 모델 키와 같다", () => {
    const { lowest, highest } = measureHeights(body, clips, model.clips.idle.startFrame);

    expect(lowest).toBeCloseTo(0, 1);
    expect(highest).toBeCloseTo(model.height, 1);
  });

  it("쓰러지면 눕고, 일어나는 모션은 누운 자세에서 시작해 선 자세로 끝난다", () => {
    const { death, revive, idle } = model.clips;
    const fallen = measureHeights(body, clips, death.startFrame + death.frameCount - 1);
    const reviveStart = measureHeights(body, clips, revive.startFrame);
    const reviveEnd = measureHeights(body, clips, revive.startFrame + revive.frameCount - 1);
    const standing = measureHeights(body, clips, idle.startFrame);

    expect(fallen.highest).toBeLessThan(model.height * 0.6);
    expect(reviveStart.highest).toBeCloseTo(fallen.highest, 1);
    expect(reviveEnd.highest).toBeCloseTo(standing.highest, 1);
  });

  it.each(LOOPING_CLIPS)("%s 은 첫 프레임과 끝 프레임이 이어진다", (clip) => {
    // 끝 프레임까지 구워 두고 셰이더가 다음 줄과 보간함. 둘이 다르면 한 바퀴마다 튐.
    const { startFrame, frameCount } = model.clips[clip];

    body.positions.forEach((point, vertex) => {
      const first = applyBone(clips, startFrame, body.boneIndices[vertex], point);
      const last = applyBone(clips, startFrame + frameCount - 1, body.boneIndices[vertex], point);

      expect(Math.hypot(first[0] - last[0], first[1] - last[1], first[2] - last[2])).toBeLessThan(
        0.01,
      );
    });
  });

  it.each(["walk", "run"] as const)("%s 은 발이 사이클 안에서 앞뒤로 움직인다", (clip) => {
    const depths = traceLowestBone(body, clips, model, clip).map(([, , z]) => z);

    // 전방이 −Z 라 발이 몸 앞(−)과 뒤(+)를 오감.
    expect(Math.max(...depths) - Math.min(...depths)).toBeGreaterThan(0.15);
  });

  it("서 있는 모션과 걷는 모션은 실제로 다른 자세다", () => {
    const idleFoot = traceLowestBone(body, clips, model, "idle");
    const walkFoot = traceLowestBone(body, clips, model, "walk");
    const idleRange =
      Math.max(...idleFoot.map(([, , z]) => z)) - Math.min(...idleFoot.map(([, , z]) => z));
    const walkRange =
      Math.max(...walkFoot.map(([, , z]) => z)) - Math.min(...walkFoot.map(([, , z]) => z));

    expect(walkRange).toBeGreaterThan(idleRange + 0.1);
  });
});
