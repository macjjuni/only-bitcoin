import { parseAssetRanking } from "../lib/parseAssetRanking";
import { ASSET_RANKING_SOURCE_URL } from "../model/constants";
import type { AssetRankingSnapshot } from "../model/types";

// region [Privates]
const MAX_FETCH_ATTEMPTS = 2;
// 해외 원본의 느린 응답을 허용한다. 재시도 포함 최대 40.5초이므로 라우트는 60초를 확보한다.
const REQUEST_TIMEOUT_IN_MILLISECONDS = 20_000;
const RETRY_DELAY_IN_MILLISECONDS = 500;
// endregion

// region [Transactions]
/** 403은 재시도하지 않고 429·5xx·통신 장애만 재시도한다. 실패 결과는 캐시하지 않는다. */
export const collectAssetRanking = async (): Promise<AssetRankingSnapshot> => {
  for (let attempt = 1; attempt <= MAX_FETCH_ATTEMPTS; attempt += 1) {
    let response: Response;
    let html: string;

    try {
      response = await fetch(ASSET_RANKING_SOURCE_URL, {
        cache: "no-store",
        headers: { accept: "text/html" },
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_IN_MILLISECONDS),
      });
      html = await response.text();
    } catch (error) {
      if (attempt === MAX_FETCH_ATTEMPTS) {
        throw error;
      }
      await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY_IN_MILLISECONDS));
      continue;
    }

    if (!response.ok) {
      const shouldRetry = response.status === 429 || response.status >= 500;
      if (shouldRetry && attempt < MAX_FETCH_ATTEMPTS) {
        await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY_IN_MILLISECONDS));
        continue;
      }
      throw new Error(`자산 랭킹 수집 실패: HTTP ${response.status}`);
    }

    if (!response.headers.get("content-type")?.includes("text/html")) {
      throw new Error("자산 랭킹 응답이 HTML이 아닙니다.");
    }

    return { assets: parseAssetRanking(html), fetchedAt: new Date().toISOString() };
  }

  throw new Error("자산 랭킹을 수집하지 못했습니다.");
};
// endregion
