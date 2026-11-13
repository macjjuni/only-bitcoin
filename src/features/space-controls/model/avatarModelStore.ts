"use client";

import { isAvatarModelIndex, SPACE_DEFAULT_AVATAR_MODEL_INDEX } from "@/entities/space";

/**
 * 고른 아바타 모델을 브라우저에 남긴다.
 *
 * 닉네임(`saveChatNickname`)과 같은 방침이다. 서버는 좌석을 돌려줄 때 입장
 * 프레임에 담긴 값을 그대로 쓰므로, 다시 접속할 때 같은 모습으로 들어가려면
 * 클라이언트가 기억해야 한다.
 *
 * 스토어를 따로 만들지 않고 `localStorage` 를 직접 읽는다. 모델 선택은 입장할
 * 때 한 번 읽고 바꿀 때 한 번 쓰는 값이라 구독이 필요 없다.
 */
const STORAGE_KEY = "only-btc.space.avatar-model";

export const loadAvatarModelIndex = (): number => {
  if (typeof window === "undefined") {
    return SPACE_DEFAULT_AVATAR_MODEL_INDEX;
  }

  try {
    const rawValue = window.localStorage.getItem(STORAGE_KEY);

    // 고른 적이 없으면 기본 모델임. `Number(null)` 이 0 이라 그냥 바꾸면 0번 모델로 읽힘.
    if (rawValue === null || rawValue.trim() === "") {
      return SPACE_DEFAULT_AVATAR_MODEL_INDEX;
    }
    const stored = Number(rawValue);

    return isAvatarModelIndex(stored) ? stored : SPACE_DEFAULT_AVATAR_MODEL_INDEX;
  } catch {
    // 사파리 프라이빗 모드 등에서 localStorage 접근이 막힌다.
    return SPACE_DEFAULT_AVATAR_MODEL_INDEX;
  }
};

export const saveAvatarModelIndex = (modelIndex: number): void => {
  if (typeof window === "undefined" || !isAvatarModelIndex(modelIndex)) {
    return;
  }

  try {
    window.localStorage.setItem(STORAGE_KEY, String(modelIndex));
  } catch {
    // 저장이 막혀도 이번 세션의 선택은 그대로 쓴다.
  }
};
