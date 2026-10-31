import { chatConfig } from "./chat";
import { env } from "./env";

/** 광고를 끄는 값. 그 밖의 값은 모두 노출로 읽는다. */
const AD_DISABLED_VALUES = new Set(["false", "0", "off", "no"]);

/** 채팅과 같은 Worker를 쓰되 별도 공간 엔드포인트로 연결한다. */
export const resolveSpaceWebSocketUrl = (chatWebSocketUrl: string): string => {
  return chatWebSocketUrl ? new URL("/v1/space/ws", chatWebSocketUrl).toString() : "";
};

/**
 * 전광판 좌우 광고판과 전광판 위 텍스트 배너를 노출할지.
 *
 * 값이 없으면 노출한다. 변수를 빼먹은 배포에서 광고가 조용히 사라지면 원인을
 * 찾기 어렵다. 끄려면 `false`·`0`·`off`·`no` 중 하나를 넣는다. 벽면 장비함은
 * 광고가 아니라 벽 구조라서 이 스위치와 무관하게 남는다.
 */
export const resolveSpaceAdEnabled = (rawValue: string): boolean => {
  return !AD_DISABLED_VALUES.has(rawValue.trim().toLowerCase());
};

export const spaceConfig = {
  webSocketUrl: resolveSpaceWebSocketUrl(chatConfig.webSocketUrl),
  isConnectionConfigured: chatConfig.webSocketUrl.length > 0,
  isAdEnabled: resolveSpaceAdEnabled(env.NEXT_PUBLIC_SPACE_ADS_ENABLED),
} as const;
