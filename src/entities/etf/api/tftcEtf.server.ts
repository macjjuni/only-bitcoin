import {
  createEmptyBitcoinEtfSnapshot,
  normalizeTftcEtfFlowResponse,
} from "../lib/normalizeTftcEtfFlow";
import type { BitcoinEtfSnapshot, TftcEtfFlowResponse } from "../model/types";

// region [Privates]
/**
 * The Commoner Bitcoin ETF Tracker( TFTC )의 전체 이력 파일. CC BY 4.0.
 * 2024-01-11 첫 거래일부터의 일별 순유입 · ETF별 내역 · 전체 운용자산 · BTC 가격이 한 파일에 있음.
 *
 * 예전엔 Xoomar 를 썼는데 2026-09 부터 12개 중 3개 ETF 만 주기 시작해서 바꿈.
 * 전체 이력이 매번 통째로 와서 로컬 아카이브를 따로 두지 않음.
 */
const TFTC_ETF_FLOW_DATA_URL = "https://www.tftc.io/bitcoin-etf-flows/data.json";

/**
 * 서버 캐시 주기(초). 1시간.
 * 원천은 하루 두 번( 02:00 · 10:00 UTC ) 갱신해서 이 정도면 충분함.
 * `/etf` page.tsx 의 revalidate 리터럴과 항상 같이 바꿔야 함.
 */
export const BITCOIN_ETF_REVALIDATE_SECONDS = 60 * 60;

const MAX_FETCH_ATTEMPTS = 2;
const RETRY_DELAY_IN_MILLISECONDS = 1000;
/** 응답이 안 오면 끊음. 안 그러면 ISR 재생성이 함수 제한 시간까지 매달림. */
const REQUEST_TIMEOUT_IN_MILLISECONDS = 10_000;

const delay = (delayInMilliseconds: number): Promise<void> => {
  return new Promise((resolve) => setTimeout(resolve, delayInMilliseconds));
};

/** 429 · 5xx · 통신 장애 · 타임아웃만 한 번 재시도함. 최종 실패는 null. */
const fetchTftcEtfFlowResponse = async (): Promise<TftcEtfFlowResponse | null> => {
  let lastErrorMessage = "";

  for (let attempt = 1; attempt <= MAX_FETCH_ATTEMPTS; attempt += 1) {
    try {
      const response = await fetch(TFTC_ETF_FLOW_DATA_URL, {
        headers: { accept: "application/json" },
        next: { revalidate: BITCOIN_ETF_REVALIDATE_SECONDS },
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_IN_MILLISECONDS),
      });

      if (response.ok) {
        return (await response.json()) as TftcEtfFlowResponse;
      }

      lastErrorMessage = `HTTP ${response.status} (${response.statusText})`;
      const shouldRetry = response.status === 429 || response.status >= 500;
      if (!shouldRetry) {
        break;
      }
    } catch (error) {
      lastErrorMessage = error instanceof Error ? error.message : "알 수 없는 오류";
    }

    if (attempt < MAX_FETCH_ATTEMPTS) {
      await delay(RETRY_DELAY_IN_MILLISECONDS);
    }
  }

  console.warn(`TFTC ETF 흐름 조회 최종 실패: ${lastErrorMessage}`);
  return null;
};
// endregion

// region [Transactions]
/**
 * 비트코인 현물 ETF 일별 흐름 스냅샷 조회.
 * 조회에 실패하거나 형식이 깨졌으면 `hasFetchFailed` 가 켜진 빈 스냅샷을 돌려줌.
 */
export const fetchBitcoinEtfSnapshot = async (): Promise<BitcoinEtfSnapshot> => {
  const response = await fetchTftcEtfFlowResponse();

  return response ? normalizeTftcEtfFlowResponse(response) : createEmptyBitcoinEtfSnapshot();
};
// endregion
