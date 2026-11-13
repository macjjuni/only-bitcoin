import { describe, expect, it } from "vitest";
import {
  isAvatarModelIndex,
  resolveAvatarCombat,
  resolveAvatarModel,
  resolveAvatarModelIndex,
  SPACE_AVATAR_MODELS,
  SPACE_DEFAULT_AVATAR_MODEL_INDEX,
} from "./avatarModel";
import { resolveKickServerIntervalMs } from "./kick";

describe("SPACE_AVATAR_MODELS", () => {
  it("모델 ID 가 겹치지 않는다", () => {
    const ids = SPACE_AVATAR_MODELS.map((model) => model.id);

    expect(new Set(ids).size).toBe(ids.length);
  });

  it("에셋 경로가 public 기준 절대 경로다", () => {
    for (const model of SPACE_AVATAR_MODELS) {
      expect(model.modelUrl).toBe(`/models/${model.id}.glb`);
      expect(model.clipsUrl).toBe(`/models/${model.id}-clips.bin`);
    }
  });

  it("메시 이름이 모델 ID 접두사를 따른다", () => {
    // 굽는 스크립트가 접두사로 이름을 붙인다. 어긋나면 런타임에서 메시를 못 찾는다.
    for (const model of SPACE_AVATAR_MODELS) {
      expect(model.bodyMeshName).toBe(`${model.id}_body`);
      expect(model.accentMeshName).toBe(`${model.id}_accent`);
    }
  });

  it("모션들이 겹치지 않고 빈틈없이 이어져 전체 프레임 수를 채운다", () => {
    for (const model of SPACE_AVATAR_MODELS) {
      const ranges = Object.values(model.clips).sort(
        (first, second) => first.startFrame - second.startFrame,
      );
      let nextStart = 0;

      for (const range of ranges) {
        expect(range.startFrame).toBe(nextStart);
        // 보간하려면 두 줄은 있어야 한다.
        expect(range.frameCount).toBeGreaterThanOrEqual(2);
        expect(range.seconds).toBeGreaterThan(0);
        nextStart += range.frameCount;
      }
      expect(nextStart).toBe(model.clipFrameCount);
    }
  });

  it("기본 모델이 목록 안에 있다", () => {
    expect(SPACE_AVATAR_MODELS[SPACE_DEFAULT_AVATAR_MODEL_INDEX]).toBeDefined();
  });
});

describe("캐릭터별 공격 성격", () => {
  it("초당 피해가 캐릭터끼리 비슷하다", () => {
    // 한 캐릭터가 확실히 세면 다들 그것만 고른다. 차이는 싸우는 방식에만 둔다.
    // 버거빠따킹은 느려서 놓치는 공격을 메우려고 일부러 16 % 높게 뒀다. 그 이상은 막는다.
    const damagePerSecond = SPACE_AVATAR_MODELS.map(
      ({ combat }) => combat.kickDamage / (combat.cooldownMs / 1000),
    );

    expect(Math.max(...damagePerSecond) / Math.min(...damagePerSecond)).toBeLessThan(1.2);
  });

  it("공격 모션이 쿨다운 안에 끝난다", () => {
    // 길면 다음 공격이 앞 모션을 끊고 시작해 휘두르다 만 것처럼 보인다.
    for (const { id, combat } of SPACE_AVATAR_MODELS) {
      expect(combat.attackSeconds * 1000, id).toBeLessThanOrEqual(combat.cooldownMs);
      expect(combat.attackSeconds, id).toBeGreaterThan(0.2);
      // 닿는 순간은 모션 안에 있어야 함. 모션이 끝난 뒤 피해가 뜨면 어긋나 보임.
      expect(combat.impactSeconds, id).toBeGreaterThan(0);
      expect(combat.impactSeconds, id).toBeLessThan(combat.attackSeconds);
      expect(combat.kickDamage, id).toBeGreaterThan(0);
    }
  });

  it("서버가 받는 최소 간격은 쿨다운의 절반 아래로 내려가지 않는다", () => {
    // 쿨다운이 짧은 캐릭터에서 여유를 통째로 빼면 제한이 사라져 연타 조작이 통한다.
    for (const { id, combat } of SPACE_AVATAR_MODELS) {
      const interval = resolveKickServerIntervalMs(combat.cooldownMs);

      expect(interval, id).toBeGreaterThanOrEqual(combat.cooldownMs / 2);
      expect(interval, id).toBeLessThanOrEqual(combat.cooldownMs);
    }
    expect(resolveKickServerIntervalMs(1_500)).toBe(1_000);
    expect(resolveKickServerIntervalMs(550)).toBe(275);
  });

  it("범위 밖 번호는 기본 모델의 것을 준다", () => {
    expect(resolveAvatarCombat(99)).toBe(
      SPACE_AVATAR_MODELS[SPACE_DEFAULT_AVATAR_MODEL_INDEX].combat,
    );
  });
});

describe("resolveAvatarModel", () => {
  it("범위 안 번호는 그 모델을 준다", () => {
    expect(resolveAvatarModel(0).id).toBe("redcrew");
    expect(resolveAvatarModel(1).id).toBe("nightshift");
    expect(resolveAvatarModel(2).id).toBe("pepe");
  });

  it("범위를 벗어나면 기본 모델로 떨어진다", () => {
    // 캐릭터가 더 많던 때의 번호도 여기로 온다. 안 그리는 것보다 기본 모델이 낫다.
    for (const invalid of [-1, 7, 99, 1.5, Number.NaN]) {
      expect(resolveAvatarModel(invalid)).toBe(
        SPACE_AVATAR_MODELS[SPACE_DEFAULT_AVATAR_MODEL_INDEX],
      );
      expect(resolveAvatarModelIndex(invalid)).toBe(SPACE_DEFAULT_AVATAR_MODEL_INDEX);
    }
    expect(resolveAvatarModelIndex(undefined)).toBe(SPACE_DEFAULT_AVATAR_MODEL_INDEX);
  });
});

describe("isAvatarModelIndex", () => {
  it("정수 범위만 통과시킨다", () => {
    expect(isAvatarModelIndex(0)).toBe(true);
    expect(isAvatarModelIndex(SPACE_AVATAR_MODELS.length - 1)).toBe(true);
    expect(isAvatarModelIndex(SPACE_AVATAR_MODELS.length)).toBe(false);
    expect(isAvatarModelIndex(-1)).toBe(false);
    expect(isAvatarModelIndex(1.5)).toBe(false);
    expect(isAvatarModelIndex("0")).toBe(false);
    expect(isAvatarModelIndex(null)).toBe(false);
  });
});
