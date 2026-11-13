import { SPACE_BOSS_COMBAT } from "../../../../src/entities/space/model/boss";

/** 프로토콜이 받아 주는 체력 상한. `spaceProtocol.ts` 의 수치 검증과 같아야 함. */
const MAXIMUM_CONFIGURABLE_HEALTH = 10_000_000;

/**
 * 보스 최대 체력을 정함. 환경변수 `SPACE_BOSS_MAXIMUM_HEALTH` 가 있으면 그 값을 씀.
 *
 * 처치 흐름(쓰러짐 연출, 결과 표시, 젠 타이머)을 볼 때마다 3,000 을 깎을 수 없어서 둠.
 * `1` 로 두면 한 대에 쓰러짐. 비었거나 숫자가 아니거나 0 이하면 기본값을 씀 —
 * 잘못 넣은 값 때문에 운영 보스가 한 대에 죽으면 안 됨.
 */
export const resolveBossMaximumHealth = (rawValue: string | undefined): number => {
  const parsedValue = Number(rawValue?.trim() || Number.NaN);

  if (!Number.isFinite(parsedValue) || parsedValue <= 0) {
    return SPACE_BOSS_COMBAT.maximumHealth;
  }

  return Math.min(MAXIMUM_CONFIGURABLE_HEALTH, parsedValue);
};
