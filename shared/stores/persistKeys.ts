/**
 * 각 스토어의 localStorage persist 키.
 *
 * `only-bitcoin` 은 구버전 단일 스토어가 쓰던 키를 그대로 이어받는다.
 * 이 키의 최상위에 `theme` 이 있어야 `app/layout.tsx` 의 블로킹 스크립트가
 * 첫 페인트 전에 다크모드를 적용할 수 있다.
 */
export const STORE_PERSIST_KEY = "only-bitcoin";
export const BITCOIN_PERSIST_KEY = "only-bitcoin-bitcoin";
export const BLOCK_PERSIST_KEY = "only-bitcoin-block";
export const BTC2FIAT_PERSIST_KEY = "only-bitcoin-btc2fiat";
export const OVERVIEW_PERSIST_KEY = "only-bitcoin-overview";
