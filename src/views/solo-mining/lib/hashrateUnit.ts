/** 채굴기 스펙 표기에 쓰이는 해시레이트 단위. SI 접두어(1000의 거듭제곱) 기준. */
export type HashrateUnit = "KH" | "MH" | "GH" | "TH" | "PH" | "EH";

const HASHRATE_UNIT_MULTIPLIERS: Record<HashrateUnit, number> = {
  KH: 1e3,
  MH: 1e6,
  GH: 1e9,
  TH: 1e12,
  PH: 1e15,
  EH: 1e18,
};

export const HASHRATE_UNITS = Object.keys(HASHRATE_UNIT_MULTIPLIERS) as HashrateUnit[];

/**
 * 입력 가능한 해시레이트 상한(H/s).
 * 네트워크 전체가 1000 EH/s 수준이므로 그 이상은 오타로 간주해 계산 자체를 막는다.
 */
export const MAX_HASHRATE_IN_HASH_PER_SECOND = 1e21;

/**
 * 문자열이 해시레이트 단위인지 검사한다. 쿼리스트링·저장값 등 외부 입력 검증용.
 *
 * `in` 연산자는 프로토타입 체인까지 훑어 `"__proto__"`, `"toString"` 같은 값도 통과시키므로
 * 허용 목록에 직접 포함되어 있는지로 판별한다.
 */
export function isHashrateUnit(value: unknown): value is HashrateUnit {
  return typeof value === "string" && HASHRATE_UNITS.includes(value as HashrateUnit);
}

/**
 * 사용자 입력 문자열을 H/s 단위 숫자로 변환한다.
 * 음수·NaN·Infinity·상한 초과는 모두 0 을 돌려주어 이후 계산이 Infinity 로 오염되지 않게 한다.
 */
export function convertHashrateToHashPerSecond(
  hashrateInput: string,
  unit: HashrateUnit,
): number {
  const parsedHashrate = Number.parseFloat(hashrateInput);

  if (!Number.isFinite(parsedHashrate) || parsedHashrate <= 0) {
    return 0;
  }

  const hashrateInHashPerSecond = parsedHashrate * HASHRATE_UNIT_MULTIPLIERS[unit];

  if (hashrateInHashPerSecond > MAX_HASHRATE_IN_HASH_PER_SECOND) {
    return 0;
  }

  return hashrateInHashPerSecond;
}

/** 입력값이 상한을 넘었는지 여부. 0 반환과 구분해 안내 문구를 띄우기 위해 별도로 판별한다. */
export function isOverMaxHashrate(hashrateInput: string, unit: HashrateUnit): boolean {
  const parsedHashrate = Number.parseFloat(hashrateInput);

  if (!Number.isFinite(parsedHashrate) || parsedHashrate <= 0) {
    return false;
  }

  return parsedHashrate * HASHRATE_UNIT_MULTIPLIERS[unit] > MAX_HASHRATE_IN_HASH_PER_SECOND;
}
