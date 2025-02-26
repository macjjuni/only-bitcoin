import { floorToDecimal } from "@/shared/utils/number";
import { blockHalvingData } from "@/shared/constants/block";

const title = import.meta.env.VITE_TITLE;
export const isDev = import.meta.env.MODE === "development";

// 문서 타이틀 수정
export const setTitle = (price: string | number) => {
  document.title = `${price} | ${title}`;
};

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

export function deepEqual(obj1: object, obj2: object): boolean {
  return JSON.stringify(obj1, Object.keys(obj1).sort()) === JSON.stringify(obj2, Object.keys(obj2).sort());
}

export function isSafari() {
  return (
    navigator.userAgent.includes('Safari') &&
    !navigator.userAgent.includes('Chrome') &&
    navigator.vendor === 'Apple Computer, Inc.'
  );
}

