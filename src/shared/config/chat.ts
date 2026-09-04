import { env } from "./env";

export const CHAT_PROTOCOL_VERSION = 1 as const;
export const CHAT_NOTICE_VERSION = "1" as const;
export const CHAT_MAX_MESSAGE_GRAPHEMES = 300;
export const CHAT_COLLAPSED_MESSAGE_GRAPHEMES = 120;
export const CHAT_MAX_NICKNAME_GRAPHEMES = 8;

export const CHAT_STORAGE_KEYS = {
  clientKey: "only-bitcoin:chat:client-key:v1",
  nickname: "only-bitcoin:chat:nickname:v1",
  noticeVersion: "only-bitcoin:chat:notice-version:v1",
  passToken: "only-bitcoin:chat:pass-token:v1",
  opened: "only-bitcoin:chat:opened:v1",
} as const;

// region [Privates]
const parsePublicChatUrl = (value: string, allowedProtocols: readonly string[]): URL | null => {
  if (!value) {
    return null;
  }

  const parsedUrl = new URL(value);
  const isAllowedProtocol = allowedProtocols.includes(parsedUrl.protocol);
  const isLocalDevelopmentHost =
    parsedUrl.hostname === "localhost" || parsedUrl.hostname === "127.0.0.1";
  const requiresSecureProtocol = process.env.NODE_ENV === "production" && !isLocalDevelopmentHost;

  if (!isAllowedProtocol) {
    throw new Error(`지원하지 않는 채팅 URL 프로토콜입니다: ${parsedUrl.protocol}`);
  }

  if (requiresSecureProtocol && ["http:", "ws:"].includes(parsedUrl.protocol)) {
    throw new Error("운영 채팅 URL은 HTTPS 또는 WSS를 사용해야 합니다.");
  }

  return parsedUrl;
};

const chatApiUrl = parsePublicChatUrl(env.NEXT_PUBLIC_CHAT_API_URL, ["http:", "https:"]);
const chatWebSocketUrl = parsePublicChatUrl(env.NEXT_PUBLIC_CHAT_WS_URL, ["ws:", "wss:"]);
// endregion

export const chatConfig = {
  apiUrl: chatApiUrl?.toString().replace(/\/$/, "") ?? "",
  webSocketUrl: chatWebSocketUrl?.toString() ?? "",
  turnstileSiteKey: env.NEXT_PUBLIC_TURNSTILE_SITE_KEY,
  googleOAuthClientId: env.NEXT_PUBLIC_GOOGLE_OAUTH_CLIENT_ID,
  isConnectionConfigured: chatApiUrl !== null && chatWebSocketUrl !== null,
  isTurnstileConfigured: env.NEXT_PUBLIC_TURNSTILE_SITE_KEY.length > 0,
  isAdministratorAuthenticationConfigured: env.NEXT_PUBLIC_GOOGLE_OAUTH_CLIENT_ID.length > 0,
} as const;
