import { env } from "./env";

/** 워커 `textValidation` 의 `MAX_NICKNAME_GRAPHEMES` 와 같은 값을 유지해야 함. */
export const CHAT_MAX_NICKNAME_GRAPHEMES = 8;

/** 익명 공개 채팅 시절 키 이름 그대로임. 바꾸면 기존 사용자의 신원이 새로 뽑힘. */
export const CHAT_STORAGE_KEYS = {
  clientKey: "only-bitcoin:chat:client-key:v1",
  nickname: "only-bitcoin:chat:nickname:v1",
} as const;

// region [Privates]
const parsePublicWebSocketUrl = (value: string): URL | null => {
  if (!value) {
    return null;
  }

  const parsedUrl = new URL(value);
  const isLocalDevelopmentHost =
    parsedUrl.hostname === "localhost" || parsedUrl.hostname === "127.0.0.1";
  const requiresSecureProtocol = process.env.NODE_ENV === "production" && !isLocalDevelopmentHost;

  if (!["ws:", "wss:"].includes(parsedUrl.protocol)) {
    throw new Error(`지원하지 않는 웹소켓 URL 프로토콜입니다: ${parsedUrl.protocol}`);
  }

  if (requiresSecureProtocol && parsedUrl.protocol === "ws:") {
    throw new Error("운영 웹소켓 URL은 WSS를 사용해야 합니다.");
  }

  return parsedUrl;
};

const chatWebSocketUrl = parsePublicWebSocketUrl(env.NEXT_PUBLIC_CHAT_WS_URL);
// endregion

/** 스페이스 소켓 주소를 만드는 원본. 경로는 `resolveSpaceWebSocketUrl` 이 바꿈. */
export const chatConfig = {
  webSocketUrl: chatWebSocketUrl?.toString() ?? "",
} as const;
