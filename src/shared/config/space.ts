import { chatConfig } from "./chat";

/** 채팅과 같은 Worker를 쓰되 별도 공간 엔드포인트로 연결한다. */
export const resolveSpaceWebSocketUrl = (chatWebSocketUrl: string): string => {
  return chatWebSocketUrl ? new URL("/v1/space/ws", chatWebSocketUrl).toString() : "";
};

export const spaceConfig = {
  webSocketUrl: resolveSpaceWebSocketUrl(chatConfig.webSocketUrl),
  isConnectionConfigured: chatConfig.webSocketUrl.length > 0,
} as const;
