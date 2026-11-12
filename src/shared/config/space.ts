import { chatConfig } from "./chat";

/** 채팅과 같은 Worker를 쓰되 별도 공간 엔드포인트로 연결한다. */
export const resolveSpaceWebSocketUrl = (chatWebSocketUrl: string): string => {
  return chatWebSocketUrl ? new URL("/v1/space/ws", chatWebSocketUrl).toString() : "";
};

/** 인원수 조회 주소. 같은 Worker 를 HTTP 로 부름. `wss` 는 `https`, `ws` 는 `http` 로 바꿈. */
export const resolveSpacePresenceUrl = (chatWebSocketUrl: string): string => {
  if (!chatWebSocketUrl) {
    return "";
  }
  const presenceUrl = new URL("/v1/space/presence", chatWebSocketUrl);
  presenceUrl.protocol = presenceUrl.protocol === "wss:" ? "https:" : "http:";

  return presenceUrl.toString();
};

export const spaceConfig = {
  webSocketUrl: resolveSpaceWebSocketUrl(chatConfig.webSocketUrl),
  presenceUrl: resolveSpacePresenceUrl(chatConfig.webSocketUrl),
  isConnectionConfigured: chatConfig.webSocketUrl.length > 0,
} as const;
