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
  /** 보스 최대 체력. 비우면 기본값(3,000). 로컬에서 처치 흐름을 볼 때 `1` 로 둠. */
  SPACE_BOSS_MAXIMUM_HEALTH?: string;
  /** 개발용. 처치 뒤 이 초만큼 지나면 보스가 다시 나옴. 비우면 2시간 칸을 따름. */
  SPACE_BOSS_RESPAWN_SECONDS?: string;
  ENFORCEMENT_SECRET: string;
  IP_GUARD_SECRET: string;
}
