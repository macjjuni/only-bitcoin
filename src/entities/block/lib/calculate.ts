import type { BlockTypes } from "../model/blockSlice";
import { blockHalvingData } from "../model/constants";

/** 난이도 1 을 풀기 위해 평균적으로 시도해야 하는 해시 수 (2³²). */
export const HASHES_PER_DIFFICULTY = 2 ** 32;

/** 프로토콜이 목표로 하는 블록 생성 간격(초). */
export const TARGET_BLOCK_INTERVAL_SECONDS = 600;

/**
 * 최신 블록의 채굴 난이도.
 *
 * 스토어가 persist 되므로 `difficulty` 필드가 없던 구버전 캐시가 남아 있을 수 있고,
 * 소켓 연결 전에는 높이 0 짜리 빈 블록만 존재한다. 두 경우 모두 0 을 돌려주어
 * 호출부가 "아직 모르는 상태"와 실제 난이도를 구분할 수 있게 한다.
 */
export const getCurrentDifficulty = (blocks: BlockTypes[]): number => {
  const latestDifficulty = blocks[0]?.difficulty;

  if (typeof latestDifficulty !== "number" || !Number.isFinite(latestDifficulty)) {
    return 0;
  }
  if (latestDifficulty <= 0) {
    return 0;
  }

  return latestDifficulty;
};

/**
 * 난이도로부터 역산한 네트워크 전체 해시레이트(H/s).
 * 관측된 블록 시간에서 추정한 값과 달리 단기 변동에 흔들리지 않는다.
 */
export const calculateNetworkHashrate = (difficulty: number): number => {
  if (!Number.isFinite(difficulty) || difficulty <= 0) {
    return 0;
  }

  return (difficulty * HASHES_PER_DIFFICULTY) / TARGET_BLOCK_INTERVAL_SECONDS;
};

/**
 * 해당 블록 높이 시점의 블록 보조금(BTC).
 * 반감기 상수를 그대로 쓰므로 2028년 반감기 이후에도 코드 수정 없이 동작한다.
 */
export const getCurrentBlockSubsidy = (blockHeight: number): number => {
  if (!Number.isFinite(blockHeight) || blockHeight < 0) {
    return 0;
  }

  const currentHalvingEra = [...blockHalvingData]
    .reverse()
    .find((halvingEra) => halvingEra.blockHeight <= blockHeight);

  return currentHalvingEra ? Number(currentHalvingEra.blockReward) : 0;
};

/** 현재 블록 높이 기준 다음 반감기 정보 */
export const getNextHalvingData = (currentHeight: number) => {
  return (
    blockHalvingData.find(({ blockHeight }) => blockHeight > currentHeight) || {
      date: "2140",
      blockHeight: 6930000,
      blockReward: 0.00000000582076609134674072265625,
    }
  );
};

/** 표시용 보상 포맷. `"1.56250000"` 처럼 남은 0 을 떼고 `"1.5625"` 로 만든다. */
const formatBlockReward = (blockReward: number | string) => Number(blockReward).toString();

/**
 * 반감기 도달 시 블록 보상 변화(이전 → 이후).
 * @param halvingHeight 도달한 반감기 블록 높이
 * @returns 제네시스(첫 항목)이거나 목록에 없는 높이면 `null`
 */
export const getHalvingRewardTransition = (halvingHeight: number) => {
  const index = blockHalvingData.findIndex(({ blockHeight }) => blockHeight === halvingHeight);
  if (index <= 0) return null;

  return {
    before: formatBlockReward(blockHalvingData[index - 1].blockReward),
    after: formatBlockReward(blockHalvingData[index].blockReward),
  };
};

/** 반감기 진행률 계산 */
export const calcPercentage = (nextHalvingHeight: number | undefined, current: number) => {
  if (!nextHalvingHeight) {
    return 0;
  }

  const blockDiff = 210000 as const;

  const remain = current % blockDiff;
  return Math.round((remain / blockDiff) * 100 * 100) / 100; // 소수 둘 째 자리까지 남김
};

/**
 * 블록 높이 기준 비트코인 발행 완료 비율(%)
 * @param blockHeight 현재 블록 높이 (정수)
 */
export function minedPercent(blockHeight: number) {
  const SAT = 100_000_000n;
  const HALVING_INTERVAL = 210000n;
  const MAX_BTC = 21_000_000n * SAT;

  const H = BigInt(blockHeight);
  let totalSat = 0n;

  for (let era = 0n; ; era++) {
    const start = era * HALVING_INTERVAL;
    const end = (era + 1n) * HALVING_INTERVAL - 1n;

    if (H < start) break;

    const endBlock = H < end ? H : end;
    const blocks = endBlock - start + 1n;
    const subsidy = (50n * SAT) / 2n ** era;

    if (subsidy === 0n) break;

    totalSat += subsidy * blocks;

    if (endBlock === H) break;
  }

  return (Number(totalSat) / Number(MAX_BTC)) * 100;
}
