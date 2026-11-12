import { SPACE_KICK } from "../model/kick";

/** 이미 지난 준비 동작을 다시 기다리지 않고, 늦은 명중은 다음 적분에서 적용함. */
export const resolveKickImpactAt = (startedAt: number, now: number): number =>
  Math.max(now, startedAt + SPACE_KICK.impactSeconds * 1000);
