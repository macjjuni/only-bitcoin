import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  resolveBossChargeTravel,
  SPACE_BOSS,
  SPACE_BOSS_ATTACKS,
  SPACE_BOSS_CLIP_SECONDS,
  SPACE_BOSS_SPAWN,
  SPACE_BOSS_STRIDE,
  SPACE_BOSS_TURN,
  SPACE_HALL,
} from "@/entities/space";

/**
 * 보스 상수를 **에셋과 맞춰 둔다.**
 *
 * `boss.ts` 의 모션 길이·판정 시각·돌진 이동표는 `bear-raid-boss.glb` 에서 옮긴 값임.
 * 에셋을 다시 구우면 조용히 어긋나고, 결과가 "예고가 다 찼는데 안 맞는다" 처럼
 * 플레이해 봐야만 보여서 여기서 고정함.
 */

interface GltfAccessor {
  bufferView: number;
  byteOffset?: number;
  count: number;
  type: "SCALAR" | "VEC3" | "VEC4";
  max?: number[];
}

interface GltfJson {
  nodes: { name?: string; translation?: number[]; extras?: Record<string, unknown> }[];
  accessors: GltfAccessor[];
  bufferViews: { byteOffset?: number }[];
  animations: {
    name: string;
    channels: { sampler: number; target: { node: number; path: string } }[];
    samplers: { input: number; output: number }[];
  }[];
}

interface BossExtras {
  attackRanges: {
    Swipe: { radius: number; fullAngleDegrees: number; hitTime: number };
    Slam: { radius: number; hitTime: number; originXZ: [number, number] };
    Charge: {
      width: number;
      length: number;
      launchTime: number;
      endOfDash: number;
      originXZ: [number, number];
    };
  };
  clipSettings: Record<
    string,
    {
      durationSeconds: number;
      strideSpeedMetersPerSecond?: number;
      pivotFrom?: number;
      pivotUntil?: number;
      invulnerableUntil?: number;
    }
  >;
}

const COMPONENT_COUNT = { SCALAR: 1, VEC3: 3, VEC4: 4 } as const;

// region [Privates]
const readGlb = (modelPath: string): { json: GltfJson; binary: Buffer } => {
  const buffer = readFileSync(resolve(process.cwd(), modelPath));

  expect(buffer.readUInt32LE(0)).toBe(0x46546c67);
  const jsonLength = buffer.readUInt32LE(12);

  return {
    json: JSON.parse(buffer.subarray(20, 20 + jsonLength).toString("utf8")) as GltfJson,
    // JSON 청크 뒤에 바이너리 청크 헤더(8바이트)가 오고 그다음이 본문임.
    binary: buffer.subarray(20 + jsonLength + 8),
  };
};

const readAccessor = (json: GltfJson, binary: Buffer, accessorIndex: number): number[][] => {
  const accessor = json.accessors[accessorIndex];
  const view = json.bufferViews[accessor.bufferView];
  const componentCount = COMPONENT_COUNT[accessor.type];
  const start = (view.byteOffset ?? 0) + (accessor.byteOffset ?? 0);

  return Array.from({ length: accessor.count }, (_, row) =>
    Array.from({ length: componentCount }, (_, column) =>
      binary.readFloatLE(start + (row * componentCount + column) * 4),
    ),
  );
};

const boss = readGlb("public/models/bear-raid-boss.glb");
const extras = boss.json.nodes.find((node) => node.name === "Bear_Rig")
  ?.extras as unknown as BossExtras;
// endregion

describe("보스 상수 ↔ bear-raid-boss.glb", () => {
  it("모션 길이가 에셋과 같다", () => {
    for (const [key, seconds] of Object.entries(SPACE_BOSS_CLIP_SECONDS)) {
      const clipName = `${key[0].toUpperCase()}${key.slice(1)}`;
      const animation = boss.json.animations.find((candidate) => candidate.name === clipName);

      expect(animation, clipName).toBeDefined();
      expect(extras.clipSettings[clipName].durationSeconds, clipName).toBeCloseTo(seconds, 5);
    }

    expect(boss.json.animations).toHaveLength(Object.keys(SPACE_BOSS_CLIP_SECONDS).length);
  });

  it("공격 범위와 판정 시각이 에셋과 같다", () => {
    const { Swipe, Slam, Charge } = extras.attackRanges;

    expect(SPACE_BOSS_ATTACKS.swipe.radius).toBe(Swipe.radius);
    expect(SPACE_BOSS_ATTACKS.swipe.fullAngle).toBeCloseTo(
      (Swipe.fullAngleDegrees * Math.PI) / 180,
      6,
    );
    expect(SPACE_BOSS_ATTACKS.swipe.hitSeconds).toBeCloseTo(Swipe.hitTime, 5);
    expect(SPACE_BOSS_ATTACKS.slam.radius).toBe(Slam.radius);
    expect(SPACE_BOSS_ATTACKS.slam.forwardOffset).toBeCloseTo(Slam.originXZ[1], 3);
    expect(SPACE_BOSS_ATTACKS.slam.hitSeconds).toBeCloseTo(Slam.hitTime, 5);
    expect(SPACE_BOSS_ATTACKS.charge.width).toBe(Charge.width);
    expect(SPACE_BOSS_ATTACKS.charge.length).toBe(Charge.length);
    expect(SPACE_BOSS_ATTACKS.charge.forwardOffset).toBeCloseTo(Charge.originXZ[1], 3);
    expect(SPACE_BOSS_ATTACKS.charge.launchSeconds).toBeCloseTo(Charge.launchTime, 5);
    expect(SPACE_BOSS_ATTACKS.charge.arriveSeconds).toBeCloseTo(Charge.endOfDash, 5);
  });

  it("보폭 속도·회전 구간·무적 시간이 에셋과 같다", () => {
    const { Walk, Run, Turn, Spawn } = extras.clipSettings;

    expect(SPACE_BOSS_STRIDE.walk).toBeCloseTo(Walk.strideSpeedMetersPerSecond ?? 0, 4);
    expect(SPACE_BOSS_STRIDE.run).toBeCloseTo(Run.strideSpeedMetersPerSecond ?? 0, 4);
    expect(SPACE_BOSS_TURN.pivotFromSeconds).toBeCloseTo(Turn.pivotFrom ?? 0, 5);
    expect(SPACE_BOSS_TURN.pivotUntilSeconds).toBeCloseTo(Turn.pivotUntil ?? 0, 5);
    expect(SPACE_BOSS_SPAWN.invulnerableSeconds - SPACE_BOSS_SPAWN.riseSeconds).toBeCloseTo(
      Spawn.invulnerableUntil ?? 0,
      5,
    );
  });

  it("돌진 이동표가 에셋의 루트 이동 키와 같다", () => {
    const rootIndex = boss.json.nodes.findIndex((node) => node.name === "root");
    const charge = boss.json.animations.find((animation) => animation.name === "Charge");
    const channel = charge?.channels.find(
      (candidate) => candidate.target.node === rootIndex && candidate.target.path === "translation",
    );

    expect(channel).toBeDefined();
    if (!charge || !channel) {
      return;
    }

    const sampler = charge.samplers[channel.sampler];
    const times = readAccessor(boss.json, boss.binary, sampler.input);
    const positions = readAccessor(boss.json, boss.binary, sampler.output);

    expect(times.length).toBeGreaterThan(60);
    for (const [index, [seconds]] of times.entries()) {
      const [sideways, vertical, forward] = positions[index];

      expect(sideways).toBeCloseTo(0, 4);
      expect(vertical).toBeCloseTo(0, 4);
      expect(resolveBossChargeTravel(seconds), `${seconds.toFixed(3)}초`).toBeCloseTo(forward, 2);
    }
  });

  it("돌진은 출발 전에 0, 도착 뒤에 끝 거리에 머문다", () => {
    const { launchSeconds, arriveSeconds, travel } = SPACE_BOSS_ATTACKS.charge;

    expect(resolveBossChargeTravel(0)).toBe(0);
    expect(resolveBossChargeTravel(launchSeconds)).toBe(0);
    expect(resolveBossChargeTravel(arriveSeconds)).toBe(travel);
    expect(resolveBossChargeTravel(SPACE_BOSS_CLIP_SECONDS.charge)).toBe(travel);
  });
});

describe("보스 아레나 ↔ bitcoin_hall_draco.glb", () => {
  it("중심이 맵의 Snow_Arena_Center 와 같다", () => {
    const hall = readGlb("public/models/bitcoin_hall_draco.glb");
    const center = hall.json.nodes.find((node) => node.name === "Snow_Arena_Center");

    expect(center?.translation).toBeDefined();

    const [x, y, z] = center?.translation ?? [];

    expect(SPACE_BOSS.arena.centerX).toBe(x);
    expect(SPACE_BOSS.arena.centerZ).toBe(z);
    expect(SPACE_BOSS.arena.floorY).toBe(y + SPACE_HALL.mapOffsetY);
  });
});
