/**
 * 공격 동작 규칙. 서버 판정과 클라이언트 연출이 같이 씀.
 *
 * 유저끼리는 맞지 않음. 동작만 모두에게 보임. 다 같이 몬스터를 잡는 콘텐츠를 넣으려고
 * 유저끼리 치고 밀리던 것(넉백)을 뺐음. 이름의 kick 은 처음에 발차기였던 흔적이고
 * 프로토콜 프레임 이름이라 그대로 둠. 근거는 `docs/btc-space-3d.md` §11.4.1.
 */
export const SPACE_KICK = {
  /**
   * 표준 공격 간격(ms). 캐릭터마다 실제 간격은 다름(`SpaceAvatarCombat.cooldownMs`).
   *
   * 서버는 아래 도착 지연 여유를 적용함.
   */
  cooldownMs: 1_000,
  /**
   * 서버 쿨다운 여유(ms). 서버는 쿨다운에서 이만큼 뺀 간격까지 받음.
   * 쿨다운이 짧은 캐릭터는 쿨다운의 절반까지만 뺌(`resolveKickServerIntervalMs`).
   *
   * 클라이언트와 같은 간격으로 보면 앞 요청이 늦게, 뒤 요청이 빨리 도착했을 때 서버에선
   * 쿨다운보다 조금 짧아 보여 정상 공격을 연출까지 통째로 버렸음.
   */
  serverCooldownToleranceMs: 500,
  /** 표준 공격 연출 길이(초). 캐릭터마다 실제 길이는 다름(`SpaceAvatarCombat.attackSeconds`). */
  animationSeconds: 0.55,
  /** 클라이언트가 보내는 공격 시각을 서버가 되돌려 인정하는 최대 시간. */
  maximumBackdateMs: 500,
} as const;

/**
 * 서버가 받아 주는 최소 공격 간격(ms).
 *
 * 쿨다운에서 도착 지연 여유를 뺀 값임. 여유는 쿨다운의 절반을 넘기지 않음 — 쿨다운이
 * 0.55초인 캐릭터에서 0.5초를 통째로 빼면 사실상 제한이 없어져 연타 조작이 그대로 통함.
 */
export const resolveKickServerIntervalMs = (cooldownMs: number): number => {
  return cooldownMs - Math.min(SPACE_KICK.serverCooldownToleranceMs, cooldownMs / 2);
};

/** 서버·클라이언트가 같이 지원한다고 알리는 기능 이름. */
export const SPACE_FEATURE_KICK = "kick";
/** 공격 식별자와 서버 시간축을 지원함. 옛 kick 프레임도 계속 받음. */
export const SPACE_FEATURE_KICK_TIMING = "kick-timing-v1";
