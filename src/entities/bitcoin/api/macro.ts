import { getCurrentDateKST } from "@/shared/lib/date";
import { calculateBitcoinDominance } from "../lib/dominance";
import {
  NAVER_EXCHANGE_RATE_URL,
  type NaverExchangeRateResponse,
  parseUsdExchangeRate,
} from "../lib/exchange-rate";
import type { FearGreedIndexResponseTypes, ICurrency } from "../model/types";

// region [Types]
export interface MacroIndicators {
  /** 비트코인 도미넌스(%) */
  dominance: number;
  /** 공포탐욕지수(0~100) */
  fearGreedIndex: number;
  /** USD → KRW 환율 */
  usdExRate: number;
  /** 환율 조회 일자(YYYY-MM-DD). 조회 실패 시 빈 문자열 */
  usdExRateDate: string;
}
// endregion

// region [Privates]
const BTC_DOMINANCE_API_URL =
  "https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=250&page=1&sparkline=false";
const FEAR_GREED_INDEX_API_URL = "https://api.alternative.me/fng/";

/**
 * 서버 캐시 주기(초).
 * 도미넌스/공포탐욕지수는 변동이 느려 12시간, 환율은 1시간.
 * 어느 쪽이든 클라이언트가 마운트 직후 최신값으로 다시 조회하므로,
 * 서버 값은 크롤러와 첫 페인트를 위한 것이면 충분하다.
 */
const SLOW_REVALIDATE_SECONDS = 60 * 60 * 12;
const EX_RATE_REVALIDATE_SECONDS = 60 * 60;

const EMPTY_MACRO: MacroIndicators = {
  dominance: 0,
  fearGreedIndex: 0,
  usdExRate: 0,
  usdExRateDate: "",
};

/**
 * 외부 API 호출. 실패해도 렌더링은 계속되어야 하므로 null 로 흡수한다.
 */
const fetchMacro = async <T>(url: string, revalidate: number): Promise<T | null> => {
  try {
    const res = await fetch(url, { next: { revalidate } });
    if (!res.ok) return null;

    return (await res.json()) as T;
  } catch (error) {
    console.warn(`초기 매크로 지표 조회 실패: ${url}`, error);
    return null;
  }
};
// endregion

// region [Transactions]
/**
 * SSR 초기 매크로 지표 조회(도미넌스 / 공포탐욕지수 / 환율).
 *
 * 클라이언트 쿼리로만 채우면 크롤러가 보는 HTML 에는 0 만 남으므로 서버에서 미리 읽는다.
 * 일부가 실패해도 나머지 값은 그대로 사용한다.
 */
export const fetchMacroIndicators = async (): Promise<MacroIndicators> => {
  const [markets, fearGreed, exRate] = await Promise.all([
    fetchMacro<ICurrency[]>(BTC_DOMINANCE_API_URL, SLOW_REVALIDATE_SECONDS),
    fetchMacro<FearGreedIndexResponseTypes>(FEAR_GREED_INDEX_API_URL, SLOW_REVALIDATE_SECONDS),
    fetchMacro<NaverExchangeRateResponse>(NAVER_EXCHANGE_RATE_URL, EX_RATE_REVALIDATE_SECONDS),
  ]);

  const usdExRate = (exRate && parseUsdExchangeRate(exRate)) || EMPTY_MACRO.usdExRate;

  return {
    dominance: markets ? calculateBitcoinDominance(markets) : EMPTY_MACRO.dominance,
    fearGreedIndex: fearGreed ? Number(fearGreed.data[0].value) : EMPTY_MACRO.fearGreedIndex,
    usdExRate,
    usdExRateDate: usdExRate ? getCurrentDateKST() : EMPTY_MACRO.usdExRateDate,
  };
};
// endregion
