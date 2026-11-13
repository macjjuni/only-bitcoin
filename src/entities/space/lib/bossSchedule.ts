import { SPACE_BOSS_SPAWN_INTERVAL_MS } from "@/entities/space/model/boss";

/**
 * 보스 젠 시각 계산. 서버와 클라이언트가 같은 식을 씀.
 *
 * 저장하는 값은 **마지막 처치 시각 하나**뿐임. 2시간 칸을 벽시계에 맞추고
 * "마지막 처치가 지금 칸보다 앞이면 보스가 있다" 로 봄. 못 잡으면 처치 시각이 안 바뀌어
 * 계속 있고, 살아 있는 채 다음 칸이 와도 식이 그대로 참이라 유지됨.
 *
 * 그래서 서버 타이머가 필요 없음. 방이 비어 서버가 잠들어 있어도 젠 시각이 되면
 * 클라이언트가 스스로 보스를 그림.
 */

/**
 * 한국 시간(UTC+9)의 짝수 정시에 칸이 시작하게 하는 밀림값(ms).
 *
 * 2시간 칸을 UTC 기준으로 자르면 한국 시간으로는 홀수 정시(1, 3, 5시 …)가 됨.
 * 한 시간 밀어 짝수 정시에 맞췄음.
 */
const BOSS_SLOT_OFFSET_MS = 60 * 60 * 1_000;

/** `nowMs` 가 속한 칸의 시작 시각. */
export const resolveBossSlotStart = (nowMs: number): number => {
  const shifted = nowMs - BOSS_SLOT_OFFSET_MS;

  return (
    Math.floor(shifted / SPACE_BOSS_SPAWN_INTERVAL_MS) * SPACE_BOSS_SPAWN_INTERVAL_MS +
    BOSS_SLOT_OFFSET_MS
  );
};

/** 지금 보스가 있는지. 한 번도 안 잡았으면(`null`) 있음. */
export const isBossPresent = (nowMs: number, lastKilledAt: number | null): boolean => {
  return lastKilledAt === null || lastKilledAt < resolveBossSlotStart(nowMs);
};

/**
 * 지금 있는 보스가 나타난 시각. 없으면 `null`.
 *
 * 처치한 칸의 다음 칸 시작임. 한 번도 안 잡았으면 지금 칸 시작으로 봄.
 * 등장 연출을 이 시각부터 틀어서, 젠 직후에 들어온 사람도 솟아오르는 중간부터 봄.
 */
export const resolveBossSpawnedAt = (nowMs: number, lastKilledAt: number | null): number | null => {
  if (!isBossPresent(nowMs, lastKilledAt)) {
    return null;
  }

  return lastKilledAt === null
    ? resolveBossSlotStart(nowMs)
    : resolveBossSlotStart(lastKilledAt) + SPACE_BOSS_SPAWN_INTERVAL_MS;
};

/** 다음 젠 시각. 보스가 없을 때 남은 시간을 보여 주는 데 씀. */
export const resolveNextBossSpawnAt = (nowMs: number): number => {
  return resolveBossSlotStart(nowMs) + SPACE_BOSS_SPAWN_INTERVAL_MS;
};
