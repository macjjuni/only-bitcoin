import { describe, expect, it } from "vitest";
import {
  isAvatarModelIndex,
  resolveAvatarModel,
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
      expect(model.modelUrl.startsWith("/models/")).toBe(true);
      expect(model.walkUrl.endsWith("-walk.bin")).toBe(true);
    }
  });

  it("메시 이름이 모델 ID 접두사를 따른다", () => {
    // 가공 스크립트가 접두사로 이름을 붙인다. 어긋나면 런타임에서 메시를 못 찾는다.
    for (const model of SPACE_AVATAR_MODELS) {
      expect(model.bodyMeshName).toBe(`${model.id}_body`);
      expect(model.accentMeshName).toBe(`${model.id}_accent`);
    }
  });

  it("기본 모델이 목록 안에 있다", () => {
    expect(SPACE_AVATAR_MODELS[SPACE_DEFAULT_AVATAR_MODEL_INDEX]).toBeDefined();
  });
});

describe("resolveAvatarModel", () => {
  it("범위 안 번호는 그 모델을 준다", () => {
    expect(resolveAvatarModel(0).id).toBe("crew");
    expect(resolveAvatarModel(1).id).toBe("bear");
  });

  it("범위를 벗어나면 기본 모델로 떨어진다", () => {
    // 아바타를 안 그리는 것보다 기본 모델로 보이는 쪽이 낫다.
    for (const invalid of [-1, 99, 1.5, Number.NaN]) {
      expect(resolveAvatarModel(invalid)).toBe(
        SPACE_AVATAR_MODELS[SPACE_DEFAULT_AVATAR_MODEL_INDEX],
      );
    }
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
