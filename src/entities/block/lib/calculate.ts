import { blockHalvingData } from "../model/constants";

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
