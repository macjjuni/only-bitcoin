import { floorToDecimal } from "@/shared/utils/number";
import type { ICurrency } from "../model/types";

/**
 * 시가총액 목록에서 비트코인 도미넌스(%)를 계산한다.
 * 서버(SSR 초기값)와 클라이언트 쿼리 양쪽에서 쓰이므로 순수 함수로 분리한다.
 */
export const calculateBitcoinDominance = (list: ICurrency[]): number => {
  let btcCap = 0;
  let totalCap = 0;

  list.forEach((currency) => {
    if (currency.id === "bitcoin") {
      btcCap = currency.market_cap;
    }
    totalCap += currency.market_cap;
  });

  if (!totalCap) return 0;

  return floorToDecimal((btcCap / totalCap) * 100, 2);
};
