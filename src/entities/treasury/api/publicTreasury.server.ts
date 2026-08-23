import {
  buildPublicTreasurySummary,
  normalizeCompanyTreasuryHolding,
} from "../lib/normalizeTreasury";
import type {
  CompanyTreasuryHolding,
  PublicTreasuryResponse,
  PublicTreasurySnapshot,
} from "../model/types";

// region [Privates]
const PUBLIC_TREASURY_API_URL =
  "https://api.coingecko.com/api/v3/companies/public_treasury/bitcoin";

/**
 * 서버 캐시 주기(초). 10분.
 *
 * 기업 트레저리는 공시 기반이라 자주 바뀌지 않으나,
 * CoinGecko 무료 티어 제한(Public)을 고려해 페이지 단위 ISR 로 10분마다 갱신한다.
 */
export const PUBLIC_TREASURY_REVALIDATE_SECONDS = 60 * 10;

const EMPTY_SNAPSHOT: Omit<PublicTreasurySnapshot, "fetchedAt"> = {
  summary: {
    totalHoldingsInBtc: 0,
    totalValueInUsd: 0,
    marketCapDominancePercent: 0,
    totalEntryValueInUsd: 0,
    unrealizedProfitInUsd: 0,
    unrealizedProfitRatePercent: 0,
    companyCount: 0,
  },
  companies: [],
  hasFetchFailed: true,
};

const MAX_FETCH_ATTEMPTS = 3;
const RETRY_BASE_DELAY_MS = 1000;

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * 외부 API 호출. 429(Too Many Requests) 또는 일시적 네트워크 장애 시 지수 백오프로 재시도한다.
 * 실패해도 페이지 렌더링은 계속되어야 하므로 최종 실패 시 null 로 흡수한다.
 */
const fetchPublicTreasury = async (): Promise<PublicTreasuryResponse | null> => {
  let lastErrorMessage = "";

  for (let attempt = 1; attempt <= MAX_FETCH_ATTEMPTS; attempt += 1) {
    try {
      const headers: Record<string, string> = {
        accept: "application/json",
      };

      const response = await fetch(PUBLIC_TREASURY_API_URL, {
        next: { revalidate: PUBLIC_TREASURY_REVALIDATE_SECONDS },
        headers,
      });

      if (response.ok) {
        return (await response.json()) as PublicTreasuryResponse;
      }

      lastErrorMessage = `HTTP ${response.status} (${response.statusText})`;

      // 429 Rate Limit 또는 5xx 서버 에러 발생 시 재시도
      if (response.status === 429 || response.status >= 500) {
        if (attempt < MAX_FETCH_ATTEMPTS) {
          const waitTime = RETRY_BASE_DELAY_MS * 2 ** (attempt - 1);
          console.warn(
            `[CoinGecko ${response.status}] 상장기업 트레저리 조회 재시도 (${attempt}/${MAX_FETCH_ATTEMPTS}) ${waitTime}ms 후 대기...`,
          );
          await delay(waitTime);
          continue;
        }
      }

      // 그 외 4xx 클라이언트 에러는 재시도 없이 중단
      break;
    } catch (error) {
      lastErrorMessage = error instanceof Error ? error.message : "알 수 없는 오류";
      if (attempt < MAX_FETCH_ATTEMPTS) {
        await delay(RETRY_BASE_DELAY_MS * 2 ** (attempt - 1));
      }
    }
  }

  console.warn(
    `상장기업 트레저리 조회 최종 실패: ${PUBLIC_TREASURY_API_URL} (${lastErrorMessage})`,
  );
  return null;
};

/** 보유량 내림차순 정렬. API 도 같은 순서로 주지만 순서를 응답에 의존하지 않는다. */
const sortByHoldingsDescending = (
  companies: CompanyTreasuryHolding[],
): CompanyTreasuryHolding[] => {
  return [...companies].sort((a, b) => b.totalHoldingsInBtc - a.totalHoldingsInBtc);
};
// endregion

// region [Transactions]
/**
 * 상장기업 비트코인 트레저리 스냅샷 조회.
 *
 * 6시간 ISR 로 캐싱되므로 사용자 요청마다 CoinGecko 를 때리지 않는다.
 * 조회에 실패하면 `hasFetchFailed` 가 켜진 빈 스냅샷을 돌려주고, 화면에서 안내 문구로 대체한다.
 */
export const fetchPublicTreasurySnapshot = async (): Promise<PublicTreasurySnapshot> => {
  const treasuryResponse = await fetchPublicTreasury();
  const fetchedAt = new Date().toISOString();

  if (!treasuryResponse || !Array.isArray(treasuryResponse.companies)) {
    return { ...EMPTY_SNAPSHOT, fetchedAt };
  }

  const companies = sortByHoldingsDescending(
    treasuryResponse.companies.map(normalizeCompanyTreasuryHolding),
  );

  return {
    summary: buildPublicTreasurySummary(treasuryResponse, companies),
    companies,
    fetchedAt,
    hasFetchFailed: false,
  };
};
// endregion
