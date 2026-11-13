"use client";

/**
 * 배경음악을 켜 둔 상태를 브라우저에 남긴다.
 *
 * 닉네임(`saveChatNickname`) 과 같은 방침이다. 스토어를 만들지 않고
 * `localStorage` 를 직접 읽는다. 입장할 때 한 번 읽고 토글할 때 한 번 쓰는
 * 값이라 구독이 필요 없다.
 */
const STORAGE_KEY = "only-btc.space.bgm-enabled";

/**
 * 기본값은 켜짐. 직접 끈 사람만 꺼진 채로 둠.
 *
 * 브라우저가 자동 재생을 막아서 실제 소리는 첫 터치·키 입력 뒤에 남.
 * 저장값이 없는 첫 방문자도 급등 곡과 폭죽 효과음을 듣게 하려고 바꿈.
 */
export const loadBgmEnabled = (): boolean => {
  if (typeof window === "undefined") {
    return false;
  }

  try {
    return window.localStorage.getItem(STORAGE_KEY) !== "false";
  } catch {
    // 사파리 프라이빗 모드 등에서 localStorage 접근이 막힘. 기본값을 따름.
    return true;
  }
};

export const saveBgmEnabled = (isEnabled: boolean): void => {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.localStorage.setItem(STORAGE_KEY, String(isEnabled));
  } catch {
    // 저장이 막혀도 이번 세션의 선택은 그대로 쓴다.
  }
};
