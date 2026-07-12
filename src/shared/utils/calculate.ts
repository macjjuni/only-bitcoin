import { floorToDecimal } from "@/shared/utils/number";

// 김치 프리미엄 퍼센트 계산
export const calcPremiumPercent = (krwPrice: number, usdPrice: number, exRate: number) => {
  const basedUsdKRW = Math.floor(usdPrice * exRate); // 환율 * 비트코인 USD 시세
  const priceDiff = krwPrice - basedUsdKRW;
  const per = (priceDiff / krwPrice) * 100;

  return floorToDecimal(per, 2);
};

export function usdToSats(usd: number, btcPrice: number) {
  return Math.floor((usd / btcPrice) * 100_000_000);
}
