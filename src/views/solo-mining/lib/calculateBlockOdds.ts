import { calculateNetworkHashrate, HASHES_PER_DIFFICULTY } from "@/entities/block";

/**
 * 블록 1개를 발견하기까지의 평균 소요 시간(초).
 *
 * 네트워크 해시레이트 추정치가 아니라 프로토콜이 확정한 난이도를 기준으로 계산한다.
 * 해시레이트는 관측된 블록 시간에서 역산한 값이라 단기 변동이 크지만, 난이도는 상수다.
 */
export function calculateExpectedSecondsToFindBlock(
  hashrateInHashPerSecond: number,
  networkDifficulty: number,
): number {
  if (hashrateInHashPerSecond <= 0 || networkDifficulty <= 0) {
    return Number.POSITIVE_INFINITY;
  }

  return (networkDifficulty * HASHES_PER_DIFFICULTY) / hashrateInHashPerSecond;
}

/**
 * 지수분포의 중앙값(초). 절반의 채굴자가 이 시간 안에 블록을 발견한다.
 * 평균만 보여주면 "평균 100년"을 중앙값으로 오해하므로 함께 노출한다.
 */
export function calculateMedianSecondsToFindBlock(
  hashrateInHashPerSecond: number,
  networkDifficulty: number,
): number {
  return (
    calculateExpectedSecondsToFindBlock(hashrateInHashPerSecond, networkDifficulty) * Math.LN2
  );
}

/**
 * 주어진 기간 안에 최소 1블록을 발견할 확률 (포아송 분포, 0~1).
 *
 * λ 가 1e-16 수준까지 내려가면 `Math.exp(-λ)` 가 정확히 1.0 이 되어
 * `1 - Math.exp(-λ)` 는 0 을 반환한다. KH/s 급 채굴기의 블록당 확률이 정확히 이 구간이라
 * 상쇄 오차가 없는 `Math.expm1` 을 사용해야 한다.
 */
export function calculateBlockFindProbability(
  hashrateInHashPerSecond: number,
  networkDifficulty: number,
  durationInSeconds: number,
): number {
  if (durationInSeconds <= 0) {
    return 0;
  }

  const expectedSeconds = calculateExpectedSecondsToFindBlock(
    hashrateInHashPerSecond,
    networkDifficulty,
  );
  if (!Number.isFinite(expectedSeconds)) {
    return 0;
  }

  const expectedBlockCount = durationInSeconds / expectedSeconds;

  return -Math.expm1(-expectedBlockCount);
}

/** 로또 6/45 1등 당첨 확률 (1회 구매 기준, 1/8,145,060). */
export const KOREAN_LOTTERY_JACKPOT_PROBABILITY = 1 / 8_145_060;

/**
 * 로또 1등 확률 대비 몇 배인지.
 * 1보다 작으면 로또 1등이 더 잘 맞는다는 뜻이다.
 */
export function compareToLotteryJackpot(probability: number): number {
  if (!Number.isFinite(probability) || probability <= 0) {
    return 0;
  }

  return probability / KOREAN_LOTTERY_JACKPOT_PROBABILITY;
}

/** 네트워크 전체 대비 내 해시레이트 점유율(0~1). 표시용 지표. */
export function calculateNetworkShareRatio(
  hashrateInHashPerSecond: number,
  networkDifficulty: number,
): number {
  const networkHashrate = calculateNetworkHashrate(networkDifficulty);

  if (networkHashrate <= 0 || hashrateInHashPerSecond <= 0) {
    return 0;
  }

  return hashrateInHashPerSecond / networkHashrate;
}
