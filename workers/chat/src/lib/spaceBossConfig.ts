import { SPACE_BOSS_COMBAT } from "../../../../src/entities/space/model/boss";
import { SPACE_BOSS_AMOUNT_MAX } from "../../../../src/entities/space/model/spaceProtocol";

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

  return Math.min(SPACE_BOSS_AMOUNT_MAX, parsedValue);
};

/** 다시 젠되기까지 기다리는 시간의 상한(초). 실수로 큰 값을 넣어도 하루를 넘기지 않게 함. */
const MAXIMUM_RESPAWN_SECONDS = 24 * 60 * 60;

/**
 * 처치 뒤 다시 젠되기까지의 시간(초). 환경변수 `SPACE_BOSS_RESPAWN_SECONDS` 로 켬.
 *
 * **개발용임.** 원래는 2시간 칸마다 한 번 나와서, 한 번 잡으면 다음 칸까지 볼 수 없음.
 * 이 값을 주면 쓰러지는 연출이 끝나고 그만큼 뒤에 바로 다시 나옴. 처치 시각도 저장하지
 * 않아서 서버가 다시 떠도 보스가 있음.
 *
 * 비었거나 숫자가 아니거나 0 이하면 `null`(꺼짐). 운영에는 이 변수를 넣지 않음.
 */
export const resolveBossRespawnSeconds = (rawValue: string | undefined): number | null => {
  const parsedValue = Number(rawValue?.trim() || Number.NaN);

  if (!Number.isFinite(parsedValue) || parsedValue <= 0) {
    return null;
  }

  return Math.min(MAXIMUM_RESPAWN_SECONDS, parsedValue);
};
