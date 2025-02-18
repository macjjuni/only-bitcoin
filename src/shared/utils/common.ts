import { floorToDecimal } from "@/shared/utils/number";
import { blockHalvingData } from "@/shared/constants/block";

const title = import.meta.env.VITE_TITLE;
export const isDev = import.meta.env.MODE === "development";

/* ---------- 문서 타이틀 수정 ---------- */
export const setTitle = (price: string | number) => {
  document.title = `${price} | ${title}`;
};

/* ---------- 김치 프리미엄 퍼센트 계산 ---------- */
export const calcPremiumPercent = (krwPrice: number, usdPrice: number, exRate: number) => {
  const basedUsdKRW = Math.floor(usdPrice * exRate); // 환율 * 비트코인 USD 시세
  const priceDiff = krwPrice - basedUsdKRW;
  const per = (priceDiff / krwPrice) * 100;

  return floorToDecimal(per, 2);
};


/* ---------- 비트코인 반감기까지 남은 블록개수 받아서 계산 후 일/시/분 문자열 반환 ---------- */
export const calcRemainingTime = (remainingBlock: number) => {
  const target = remainingBlock * 10; // 10 = 블록 채굴 평균 분
  const days = Math.floor(target / (24 * 60)); // 일(day) 계산
  const hours = Math.floor((target % (24 * 60)) / 60); // 시간(hour) 계산
  const remainingMinutes = target % 60; // 분(minute) 계산
  return `${days}일 ${hours}시간 ${remainingMinutes}분`;
};

/* ---------- 2개의 타임스탬프로 limitTime(ms) 시간을 받아 넘었는지 안넘었는지 체크 ---------- */
export const getIsOverTimeCheck = (timeStamp1: number, timeStamp2: number, limitTime: number) => {
  return Math.abs(timeStamp1 - timeStamp2) >= limitTime;
};

// 현재 블록 높이 구하기
export const getNextHalvingData = (currentHeight: number) => {
  return blockHalvingData.find(({ blockHeight }) => blockHeight > currentHeight) ||
    { date: "2140", blockHeight: 6930000, blockReward: 0.00000000582076609134674072265625 };
};

// 반감기 진행률 계산
export const calcPercentage = (nextHalvingHeight: number | undefined, current: number) => {

  if (!nextHalvingHeight) {
    return 0;
  }

  const blockDiff = 210000 as const;

  const remain = current % blockDiff;
  return Math.round((remain / blockDiff) * 100 * 100) / 100; // 소수 둘 째 자리까지 남김
};
