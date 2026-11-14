import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  resolveBossAttackSeconds,
  resolveBossChargeTravel,
  resolveBossSpinClipSeconds,
  rollBossAttackDamage,
  rollKickDamage,
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
  nodes: {
    name?: string;
    mesh?: number;
    translation?: number[];
    extras?: Record<string, unknown>;
  }[];
  meshes: { primitives: { attributes: { POSITION: number } }[] }[];
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
    Spin: { radius: number; launchSeconds: number; arriveSeconds: number };
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

/** 상수는 에셋 값에 보스 배율을 곱해 둔 것임. 에셋과 견줄 때는 배율을 다시 나눔. */
const toAssetScale = (value: number): number => value / SPACE_BOSS.modelScale;

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

    expect(toAssetScale(SPACE_BOSS_ATTACKS.swipe.radius)).toBeCloseTo(Swipe.radius, 6);
    expect(SPACE_BOSS_ATTACKS.swipe.fullAngle).toBeCloseTo(
      (Swipe.fullAngleDegrees * Math.PI) / 180,
      6,
    );
    expect(SPACE_BOSS_ATTACKS.swipe.hitSeconds).toBeCloseTo(Swipe.hitTime, 5);
    expect(toAssetScale(SPACE_BOSS_ATTACKS.slam.radius)).toBeCloseTo(Slam.radius, 6);
    expect(toAssetScale(SPACE_BOSS_ATTACKS.slam.forwardOffset)).toBeCloseTo(Slam.originXZ[1], 3);
    expect(SPACE_BOSS_ATTACKS.slam.hitSeconds).toBeCloseTo(Slam.hitTime, 5);
    expect(toAssetScale(SPACE_BOSS_ATTACKS.charge.width)).toBeCloseTo(Charge.width, 6);
    // 돌진 길이는 배율을 안 곱함. 길어지면 아레나 짧은 쪽으로 돌진을 못 함.
    expect(SPACE_BOSS_ATTACKS.charge.length).toBe(Charge.length);
    expect(toAssetScale(SPACE_BOSS_ATTACKS.charge.forwardOffset)).toBeCloseTo(
      Charge.originXZ[1],
      3,
    );
    expect(SPACE_BOSS_ATTACKS.charge.launchSeconds).toBeCloseTo(Charge.launchTime, 5);
    expect(SPACE_BOSS_ATTACKS.charge.arriveSeconds).toBeCloseTo(Charge.endOfDash, 5);
  });

  it("회전의 도는 구간이 에셋과 같고, 판정 반지름이 그려지는 예고 원과 같다", () => {
    const { Spin } = extras.attackRanges;
    const nodeIndex = (name: string): number =>
      boss.json.nodes.findIndex((node) => node.name === name);
    const spin = boss.json.animations.find((animation) => animation.name === "Spin");
    const scaleChannel = spin?.channels.find(
      (channel) => channel.target.node === nodeIndex("AOE_Spin") && channel.target.path === "scale",
    );
    const footprint = boss.json.nodes[nodeIndex("Spin / 01 full footprint")];

    // 에셋의 도는 구간(1 ~ 2초)을 되풀이해 틂. 준비 길이와 한 번 도는 길이가 에셋과 같아야 함.
    expect(SPACE_BOSS_ATTACKS.spin.launchSeconds).toBeCloseTo(Spin.launchSeconds, 5);
    expect(SPACE_BOSS_ATTACKS.spin.loopSeconds).toBeCloseTo(
      Spin.arriveSeconds - Spin.launchSeconds,
      5,
    );
    expect(spin && scaleChannel && footprint?.mesh !== undefined).toBe(true);
    if (!spin || !scaleChannel || footprint?.mesh === undefined) {
      return;
    }

    // 예고는 내려찍기 원 메시를 줄여 그림. 메시 반지름 × 클립이 넣는 배율이 눈에 보이는 크기임.
    // `extras` 의 반지름(3.1)은 판정 여유 0.3 을 빼기 전 값이라 안 씀. 지금 여유는 0.1 이라
    // 그대로 옮기면 보이는 원(2.8)보다 넓게 맞음.
    const sampler = spin.samplers[scaleChannel.sampler];
    const [drawnScale] = readAccessor(boss.json, boss.binary, sampler.output)[0];
    const [meshRadius] =
      boss.json.accessors[boss.json.meshes[footprint.mesh].primitives[0].attributes.POSITION].max ??
      [];

    expect(toAssetScale(SPACE_BOSS_ATTACKS.spin.radius)).toBeCloseTo(meshRadius * drawnScale, 4);
    expect(toAssetScale(SPACE_BOSS_ATTACKS.spin.radius)).toBeLessThanOrEqual(Spin.radius);
  });

  it("회전은 도는 구간을 되풀이해 틀고, 다 돌면 마무리로 넘어간다", () => {
    const { launchSeconds, arriveSeconds, loopSeconds } = SPACE_BOSS_ATTACKS.spin;
    const loopCount = (arriveSeconds - launchSeconds) / loopSeconds;

    // 꽉 찬 바퀴 수만큼 돌아야 마무리로 넘어갈 때 자세가 안 튐.
    expect(loopCount).toBeCloseTo(Math.round(loopCount), 6);
    expect(resolveBossSpinClipSeconds(0.4)).toBeCloseTo(0.4, 6);
    expect(resolveBossSpinClipSeconds(launchSeconds + 0.25)).toBeCloseTo(launchSeconds + 0.25, 6);
    // 세 번째 바퀴의 0.25초 지점도 모션에서는 첫 바퀴의 같은 지점임.
    expect(resolveBossSpinClipSeconds(launchSeconds + loopSeconds * 2 + 0.25)).toBeCloseTo(
      launchSeconds + 0.25,
      6,
    );
    expect(resolveBossSpinClipSeconds(arriveSeconds)).toBeCloseTo(launchSeconds + loopSeconds, 6);
    expect(resolveBossSpinClipSeconds(resolveBossAttackSeconds("spin"))).toBeCloseTo(
      SPACE_BOSS_CLIP_SECONDS.spin,
      6,
    );
    expect(resolveBossAttackSeconds("slam")).toBe(SPACE_BOSS_CLIP_SECONDS.slam);
  });

  it("보폭 속도·회전 구간·무적 시간이 에셋과 같다", () => {
    const { Walk, Run, Turn, Spawn } = extras.clipSettings;

    expect(toAssetScale(SPACE_BOSS_STRIDE.walk)).toBeCloseTo(
      Walk.strideSpeedMetersPerSecond ?? 0,
      4,
    );
    expect(toAssetScale(SPACE_BOSS_STRIDE.run)).toBeCloseTo(Run.strideSpeedMetersPerSecond ?? 0, 4);
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

describe("rollKickDamage", () => {
  it("난수가 가운데면 기준값이고, 양 끝이면 80 % 와 120 % 다", () => {
    expect(rollKickDamage(10, 0.5)).toBe(10);
    expect(rollKickDamage(10, 0)).toBe(8);
    expect(rollKickDamage(10, 0.999_999)).toBe(12);
    expect(rollKickDamage(16, 0)).toBe(13);
    expect(rollKickDamage(16, 0.999_999)).toBe(19);
  });

  it("늘 정수이고, 피해가 작은 캐릭터도 범위가 생기며 0 은 안 나온다", () => {
    const rolled = new Set<number>();

    for (let step = 0; step < 100; step += 1) {
      rolled.add(rollKickDamage(6, step / 100));
    }

    expect(Array.from(rolled).sort()).toEqual([5, 6, 7]);
    expect(rollKickDamage(1, 0)).toBe(1);
  });

  it("고르게 뽑으면 평균이 기준값이라 초당 피해 균형이 안 바뀐다", () => {
    for (const baseDamage of [6, 10, 16]) {
      let total = 0;

      for (let step = 0; step < 1_000; step += 1) {
        total += rollKickDamage(baseDamage, (step + 0.5) / 1_000);
      }

      expect(total / 1_000).toBeCloseTo(baseDamage, 1);
    }
  });
});

describe("rollBossAttackDamage", () => {
  it("난수가 가운데면 기준값이고, 양 끝이면 80 % 와 120 % 다", () => {
    expect(rollBossAttackDamage("swipe", 0.5)).toBe(20);
    expect(rollBossAttackDamage("swipe", 0)).toBe(16);
    expect(rollBossAttackDamage("swipe", 0.999_999)).toBe(24);
    expect(rollBossAttackDamage("slam", 0)).toBe(28);
    expect(rollBossAttackDamage("slam", 0.999_999)).toBe(42);
    expect(rollBossAttackDamage("charge", 0)).toBe(24);
    expect(rollBossAttackDamage("charge", 0.999_999)).toBe(36);
    expect(rollBossAttackDamage("spin", 0)).toBe(12);
    expect(rollBossAttackDamage("spin", 0.999_999)).toBe(18);
  });
});
