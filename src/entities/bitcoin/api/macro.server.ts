import { getCurrentDateKST } from "@/shared/lib/date";
import { floorToDecimal } from "@/shared/utils/number";
import {
  NAVER_EXCHANGE_RATE_URL,
  type NaverExchangeRateResponse,
  parseUsdExchangeRate,
} from "../lib/exchange-rate";
import type {
  CoinGeckoGlobalResponse,
  FearGreedIndexResponseTypes,
  InitialMacro,
} from "../model/types";

// region [Privates]
const BTC_DOMINANCE_API_URL = "https://api.coingecko.com/api/v3/global";
const FEAR_GREED_INDEX_API_URL = "https://api.alternative.me/fng/";

/**
 * 서버 캐시 주기(초).
 * 도미넌스/공포탐욕지수 10분, 환율 1시간.
 * 클라이언트도 10분 주기로 갱신하므로 서버 캐시 맞춤.
 */
const SLOW_REVALIDATE_SECONDS = 60 * 10;
const EX_RATE_REVALIDATE_SECONDS = 60 * 60;

const EMPTY_MACRO: InitialMacro = {
  dominance: 0,
  fearGreedIndex: 0,
  usdExRate: 0,
  usdExRateDate: "",
};

/** 외부 API 호출. 실패 시 null로 흡수함. */
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
 * 크롤러용 HTML에 값 채우려고 서버에서 미리 읽음.
 * 일부 실패해도 나머지 값은 그대로 씀.
 */
export const fetchInitialMacro = async (): Promise<InitialMacro> => {
  const [global, fearGreed, exRate] = await Promise.all([
    fetchMacro<CoinGeckoGlobalResponse>(BTC_DOMINANCE_API_URL, SLOW_REVALIDATE_SECONDS),
    fetchMacro<FearGreedIndexResponseTypes>(FEAR_GREED_INDEX_API_URL, SLOW_REVALIDATE_SECONDS),
    fetchMacro<NaverExchangeRateResponse>(NAVER_EXCHANGE_RATE_URL, EX_RATE_REVALIDATE_SECONDS),
  ]);

  const usdExRate = (exRate && parseUsdExchangeRate(exRate)) || EMPTY_MACRO.usdExRate;

  return {
    dominance: global
      ? floorToDecimal(global.data.market_cap_percentage.btc, 2)
      : EMPTY_MACRO.dominance,
    fearGreedIndex: fearGreed ? Number(fearGreed.data[0].value) : EMPTY_MACRO.fearGreedIndex,
    usdExRate,
    usdExRateDate: usdExRate ? getCurrentDateKST() : EMPTY_MACRO.usdExRateDate,
  };
};
// endregion
