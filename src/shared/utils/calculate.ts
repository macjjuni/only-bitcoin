import { floorToDecimal } from "@/shared/utils/number";
import { blockHalvingData } from "@/shared/constants/block";


// 김치 프리미엄 퍼센트 계산
export const calcPremiumPercent = (krwPrice: number, usdPrice: number, exRate: number) => {
  const basedUsdKRW = Math.floor(usdPrice * exRate); // 환율 * 비트코인 USD 시세
  const priceDiff = krwPrice - basedUsdKRW;
  const per = (priceDiff / krwPrice) * 100;

  return floorToDecimal(per, 2);
};

// 현재 블록 높이 구하기
export const getNextHalvingData = (currentHeight: number) => {
  return blockHalvingData.find(({ blockHeight }) => blockHeight > currentHeight) ||
    { date: "2140", blockHeight: 6930000, blockReward: 0.00000000582076609134674072265625 };
};

// 반감기 진행률 계산
export const calcPercentage = (nextHalvingHeight: number | undefined, current: number) => {

  if (!nextHalvingHeight) { return 0; }

  const blockDiff = 210000 as const;

  const remain = current % blockDiff;
  return Math.round((remain / blockDiff) * 100 * 100) / 100; // 소수 둘 째 자리까지 남김
};

/**
 * BIP39 단어 인덱스를 받아 11비트 2진 문자열로 반환
 * @param index 0~2047 (BIP39 word index)
 * @returns 11자리의 '0'/'1' 로 구성된 문자열
 */
export function toBip39Binary(index: number) {
  if (index < 0 || index > 2048) {
    throw new Error("index must be a number between 0 and 2047");
  }
  const originStr = index.toString(2).padStart(12, "0");
  const replacedPoint = originStr.replaceAll('1', '*');
  return replacedPoint.replaceAll('0', 'O');
}
