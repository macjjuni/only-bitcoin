import { afterEach, describe, expect, it, vi } from "vitest";
import { SPACE_AVATAR_MODELS, SPACE_DEFAULT_AVATAR_MODEL_INDEX } from "@/entities/space";
import { loadAvatarModelIndex } from "./avatarModelStore";

const STORAGE_KEY = "only-btc.space.avatar-model";

// region [Privates]
/** `localStorage` 에 `storedValue` 가 들어 있는 브라우저를 흉내 냄. `null` 이면 고른 적이 없음. */
const stubStoredModel = (storedValue: string | null): void => {
  vi.stubGlobal("window", {
    localStorage: {
      getItem: (key: string) => (key === STORAGE_KEY ? storedValue : null),
    },
  });
};
// endregion

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("loadAvatarModelIndex", () => {
  it("처음 온 사람은 기본 모델(맥시크루)을 받는다", () => {
    stubStoredModel(null);

    expect(loadAvatarModelIndex()).toBe(SPACE_DEFAULT_AVATAR_MODEL_INDEX);
    expect(SPACE_AVATAR_MODELS[loadAvatarModelIndex()].label).toBe("맥시크루");
  });

  it("고른 적이 있으면 그 모델을 그대로 쓴다. 0번을 고른 것도 지킨다", () => {
    for (const modelIndex of SPACE_AVATAR_MODELS.keys()) {
      stubStoredModel(String(modelIndex));

      expect(loadAvatarModelIndex()).toBe(modelIndex);
    }
  });

  it("빈 값이나 목록에 없는 번호는 기본 모델로 떨어진다", () => {
    for (const storedValue of ["", "  ", "abc", "-1", "99", "1.5"]) {
      stubStoredModel(storedValue);

      expect(loadAvatarModelIndex(), storedValue).toBe(SPACE_DEFAULT_AVATAR_MODEL_INDEX);
    }
  });

  it("저장소 접근이 막혀 있으면 기본 모델을 준다", () => {
    vi.stubGlobal("window", {
      localStorage: {
        getItem: () => {
          throw new Error("blocked");
        },
      },
    });

    expect(loadAvatarModelIndex()).toBe(SPACE_DEFAULT_AVATAR_MODEL_INDEX);
  });
});
