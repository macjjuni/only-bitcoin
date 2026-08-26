import type { ExchangeWithdrawSnapshot } from "../model/types";
import { fetchBithumbWithdrawInfo } from "./bithumbWithdraw.server";
import { fetchUpbitWithdrawInfo } from "./upbitWithdraw.server";

/**
 * 거래소별 BTC 출금 정보를 모아서 돌려줌.
 *
 * 각 페처가 실패를 폴백으로 흡수하므로 여기서는 예외가 안 남.
 * 캐시 주기는 거래소마다 다름. ( 빗썸 10분 / 업비트 24시간 — 각 모듈 주석 참고 )
 */
export async function fetchExchangeWithdrawSnapshot(): Promise<ExchangeWithdrawSnapshot> {
  const exchanges = await Promise.all([fetchUpbitWithdrawInfo(), fetchBithumbWithdrawInfo()]);

  return {
    exchanges: [...exchanges].sort((a, b) => a.withdrawFeeInBtc - b.withdrawFeeInBtc),
    fetchedAt: new Date().toISOString(),
    hasAllFallback: exchanges.every((exchange) => exchange.source === "fallback"),
  };
}
