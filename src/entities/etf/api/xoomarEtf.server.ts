import {
  getArchivedXoomarEtfResponse,
  getBitcoinEtfArchiveLatestSourceDate,
} from "../lib/bitcoinEtfFlowArchive";
import { mergeXoomarEtfFlowResponses } from "../lib/mergeXoomarEtfFlow";
import { normalizeBitcoinEtfResponse } from "../lib/normalizeBitcoinEtf";
import type { BitcoinEtfSnapshot, XoomarEtfFlowResponse } from "../model/types";

// region [Privates]
const XOOMAR_BITCOIN_ETF_API_URL = "https://xoomar.com/api/markets/etf-flows";
const RECENT_OVERLAP_DAY_COUNT = 30;
const MAX_RUNTIME_REQUEST_DAY_COUNT = 180;
const MILLISECONDS_PER_DAY = 24 * 60 * 60 * 1000;

/** Xoomar는 미국 장 마감 후 하루 한 번 갱신하므로 1시간 캐시면 충분하다. */
export const XOOMAR_ETF_REVALIDATE_SECONDS = 60 * 60;

const MAX_FETCH_ATTEMPTS = 2;
const RETRY_DELAY_IN_MILLISECONDS = 1000;

const delay = (delayInMilliseconds: number): Promise<void> => {
  return new Promise((resolve) => setTimeout(resolve, delayInMilliseconds));
};

const buildXoomarRequestHeaders = (): HeadersInit => {
  const xoomarApiKey = process.env.XOOMAR_API_KEY?.trim();
  const headers: Record<string, string> = { accept: "application/json" };

  if (xoomarApiKey) {
    headers["X-API-Key"] = xoomarApiKey;
  }

  return headers;
};

const resolveRuntimeRequestDayCount = (): number => {
  const latestSourceDate = getBitcoinEtfArchiveLatestSourceDate();
  const latestSourceTimestamp = Date.parse(`${latestSourceDate}T00:00:00.000Z`);

  if (!Number.isFinite(latestSourceTimestamp)) {
    return MAX_RUNTIME_REQUEST_DAY_COUNT;
  }

  const missingCalendarDayCount = Math.max(
    0,
    Math.ceil((Date.now() - latestSourceTimestamp) / MILLISECONDS_PER_DAY),
  );

  return Math.min(
    MAX_RUNTIME_REQUEST_DAY_COUNT,
    Math.max(RECENT_OVERLAP_DAY_COUNT, missingCalendarDayCount + RECENT_OVERLAP_DAY_COUNT),
  );
};

const fetchXoomarEtfResponse = async (): Promise<XoomarEtfFlowResponse | null> => {
  let lastErrorMessage = "";
  const requestDayCount = resolveRuntimeRequestDayCount();
  const requestUrl = `${XOOMAR_BITCOIN_ETF_API_URL}?asset=btc&days=${requestDayCount}`;

  for (let attempt = 1; attempt <= MAX_FETCH_ATTEMPTS; attempt += 1) {
    try {
      const response = await fetch(requestUrl, {
        headers: buildXoomarRequestHeaders(),
        next: { revalidate: XOOMAR_ETF_REVALIDATE_SECONDS },
      });

      if (response.ok) {
        return (await response.json()) as XoomarEtfFlowResponse;
      }

      lastErrorMessage = `HTTP ${response.status} (${response.statusText})`;
      const shouldRetry = response.status === 429 || response.status >= 500;

      if (shouldRetry && attempt < MAX_FETCH_ATTEMPTS) {
        await delay(RETRY_DELAY_IN_MILLISECONDS);
        continue;
      }

      break;
    } catch (error) {
      lastErrorMessage = error instanceof Error ? error.message : "알 수 없는 오류";

      if (attempt < MAX_FETCH_ATTEMPTS) {
        await delay(RETRY_DELAY_IN_MILLISECONDS);
      }
    }
  }

  console.warn(`Xoomar ETF 조회 최종 실패: ${lastErrorMessage}`);
  return null;
};
// endregion

// region [Transactions]
/** 저장된 전체 이력에 Xoomar 최근 구간을 덮어써 최신 화면 모델을 만든다. */
export const fetchBitcoinEtfSnapshot = async (): Promise<BitcoinEtfSnapshot> => {
  const archivedResponse = getArchivedXoomarEtfResponse();
  const recentResponse = await fetchXoomarEtfResponse();

  if (!recentResponse || !Array.isArray(recentResponse.data)) {
    return normalizeBitcoinEtfResponse(archivedResponse);
  }

  return normalizeBitcoinEtfResponse(mergeXoomarEtfFlowResponses(archivedResponse, recentResponse));
};
// endregion
