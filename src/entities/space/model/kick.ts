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
 * 서버가 받아 주는 **낱개** 최소 공격 간격(ms). 평균 속도는 `resolveKickAdmission` 이 따로 묶음.
 *
 * 쿨다운에서 도착 지연 여유를 뺀 값임. 여유는 쿨다운의 절반을 넘기지 않음 — 쿨다운이
 * 0.55초인 캐릭터에서 0.5초를 통째로 빼면 사실상 제한이 없어져 연타 조작이 그대로 통함.
 */
export const resolveKickServerIntervalMs = (cooldownMs: number): number => {
  return cooldownMs - Math.min(SPACE_KICK.serverCooldownToleranceMs, cooldownMs / 2);
};

export interface KickAdmission {
  isAccepted: boolean;
  /** 다음 공격의 기준 시각. 받은 경우에만 앞으로 밀림. */
  readyAt: number;
}

/**
 * 이 공격을 받을지 정함. **낱개 간격은 느슨하게, 평균 속도는 쿨다운대로** 봄.
 *
 * 전에는 직전 공격과의 간격만 봤음. 지연 여유(쿨다운의 최대 절반)를 매번 통째로
 * 쓸 수 있어서, 요청을 직접 보내면 쿨다운의 절반 간격으로 계속 때려 피해를 두 배로
 * 넣을 수 있었음.
 *
 * 기준 시각(`readyAt`)을 받을 때마다 쿨다운만큼 민다. 기준보다 여유만큼 일찍 온 것까지는
 * 받지만 기준 시각은 원래 박자대로 밀리므로, 일찍 온 만큼 다음 것이 늦어야 함.
 * 도착이 들쭉날쭉한 정상 공격은 그대로 통하고, 길게 보면 쿨다운당 한 번을 못 넘김.
 *
 * @param readyAt 직전까지의 기준 시각. 처음이면 `undefined`.
 */
export const resolveKickAdmission = (
  nowMs: number,
  readyAt: number | undefined,
  cooldownMs: number,
): KickAdmission => {
  const tolerance = cooldownMs - resolveKickServerIntervalMs(cooldownMs);

  if (readyAt !== undefined && nowMs < readyAt - tolerance) {
    return { isAccepted: false, readyAt };
  }

  // 한참 쉬었다 때리면 지금부터 다시 셈. 쉰 시간을 모아 두었다 몰아 때릴 수는 없음.
  return { isAccepted: true, readyAt: Math.max(readyAt ?? nowMs, nowMs) + cooldownMs };
};

/** 서버·클라이언트가 같이 지원한다고 알리는 기능 이름. */
export const SPACE_FEATURE_KICK = "kick";
/** 공격 식별자와 서버 시간축을 지원함. 옛 kick 프레임도 계속 받음. */
export const SPACE_FEATURE_KICK_TIMING = "kick-timing-v1";
