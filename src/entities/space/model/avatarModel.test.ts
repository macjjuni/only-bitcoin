import { describe, expect, it } from "vitest";
import {
  isAvatarModelIndex,
  resolveAvatarModel,
  resolveAvatarModelIndex,
  SPACE_AVATAR_MODELS,
  SPACE_DEFAULT_AVATAR_MODEL_INDEX,
} from "./avatarModel";

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

describe("resolveAvatarModel", () => {
  it("범위 안 번호는 그 모델을 준다", () => {
    expect(resolveAvatarModel(0).id).toBe("nightshift");
  });

  it("범위를 벗어나면 기본 모델로 떨어진다", () => {
    // 캐릭터가 7종이던 때의 번호(1 ~ 7)도 여기로 온다. 안 그리는 것보다 기본 모델이 낫다.
    for (const invalid of [-1, 3, 99, 1.5, Number.NaN]) {
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
