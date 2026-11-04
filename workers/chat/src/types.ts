/**
 * 워커 바인딩·시크릿.
 *
 * 이름의 `CHAT_` 은 익명 공개 채팅 시절 이름 그대로임. 바꾸면 운영 변수와 레이트리미터를
 * 다시 등록해야 해서 둠.
 */
export interface ChatWorkerEnv {
  SPACE_ROOM: DurableObjectNamespace;
  CHAT_UPGRADE_RATE_LIMITER: RateLimit;
  CHAT_ALLOWED_ORIGINS: string;
  SPACE_DISABLE_IP_CONNECTION_LIMIT?: string;
  ENFORCEMENT_SECRET: string;
  IP_GUARD_SECRET: string;
}
