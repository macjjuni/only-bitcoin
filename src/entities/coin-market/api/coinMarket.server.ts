import { buildCoinMarketSnapshot } from "../lib/buildCoinMarketSnapshot";
import {
  COIN_GECKO_API_BASE_URL,
  COIN_MARKET_TOP_COUNT,
  STABLECOIN_LOOKUP_COUNT,
} from "../model/constants";
import type {
  CoinGeckoGlobalMarketResponse,
  CoinGeckoMarketResponseItem,
  CoinMarketSnapshot,
} from "../model/types";

// region [Privates]
/**
 * 서버 캐시 주기(초). 5분.
 * `/heatmap` page.tsx 의 revalidate 리터럴과 항상 같이 바꿔야 함.
 */
export const COIN_MARKET_REVALIDATE_SECONDS = 300;

const MAX_FETCH_ATTEMPTS = 2;
const RETRY_DELAY_MS = 1000;
/** 응답이 안 오면 끊음. 안 그러면 ISR 재생성이 함수 제한 시간까지 매달림. */
const REQUEST_TIMEOUT_MS = 10_000;

const TOP_MARKETS_URL = `${COIN_GECKO_API_BASE_URL}/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=${COIN_MARKET_TOP_COUNT}&page=1`;
const STABLECOIN_MARKETS_URL = `${COIN_GECKO_API_BASE_URL}/coins/markets?vs_currency=usd&category=stablecoins&order=market_cap_desc&per_page=${STABLECOIN_LOOKUP_COUNT}&page=1`;
const GLOBAL_URL = `${COIN_GECKO_API_BASE_URL}/global`;

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/** 429·5xx·통신 장애·타임아웃만 한 번 재시도함. 최종 실패는 null. */
const fetchCoinGecko = async <T>(url: string): Promise<T | null> => {
  for (let attempt = 1; attempt <= MAX_FETCH_ATTEMPTS; attempt += 1) {
    try {
      const response = await fetch(url, {
        next: { revalidate: COIN_MARKET_REVALIDATE_SECONDS },
        headers: { accept: "application/json" },
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      });

      if (response.ok) {
        return (await response.json()) as T;
      }

      const shouldRetry = response.status === 429 || response.status >= 500;
      if (!shouldRetry || attempt === MAX_FETCH_ATTEMPTS) {
        console.warn(`CoinGecko 조회 실패: ${url} (HTTP ${response.status})`);
        return null;
      }
    } catch (error) {
      if (attempt === MAX_FETCH_ATTEMPTS) {
        console.warn(`CoinGecko 조회 실패: ${url}`, error);
        return null;
      }
    }
    await delay(RETRY_DELAY_MS);
  }
  return null;
};
// endregion

// region [Transactions]
/**
 * 상위 코인 + 전체 시총 스냅샷 조회.
 * 스테이블 목록은 색 구분용이라 실패해도 전부 일반 코인으로 보고 진행함.
 */
export const fetchCoinMarketSnapshot = async (): Promise<CoinMarketSnapshot> => {
  const fetchedAt = new Date().toISOString();
  const [markets, global, stablecoins] = await Promise.all([
    fetchCoinGecko<CoinGeckoMarketResponseItem[]>(TOP_MARKETS_URL),
    fetchCoinGecko<CoinGeckoGlobalMarketResponse>(GLOBAL_URL),
    fetchCoinGecko<CoinGeckoMarketResponseItem[]>(STABLECOIN_MARKETS_URL),
  ]);

  const snapshot =
    Array.isArray(markets) && global
      ? buildCoinMarketSnapshot({
          markets,
          totalMarketCapInUsd: global.data?.total_market_cap?.usd ?? 0,
          bitcoinDominancePercent: global.data?.market_cap_percentage?.btc,
          stablecoinIds: new Set(
            Array.isArray(stablecoins) ? stablecoins.map((coin) => coin.id) : [],
          ),
          fetchedAt,
        })
      : null;

  return (
    snapshot ?? {
      coins: [],
      totalMarketCapInUsd: 0,
      othersMarketCapInUsd: 0,
      bitcoinDominancePercent: 0,
      fetchedAt,
      hasFetchFailed: true,
    }
  );
};
// endregion
