import { unstable_cache } from "next/cache";
import { ASSET_RANKING_REVALIDATE_SECONDS, ASSET_RANKING_SOURCE_URL } from "../model/constants";
import { collectAssetRanking } from "./collectAssetRanking.server";

/**
 * Cache Components를 쓰지 않는 현재 프로젝트의 Next Data Cache를 사용한다.
 * HTML이 아닌 검증된 스냅샷만 저장하며, 재검증에서 throw하면 이전 정상 결과가 유지된다.
 * 캐시 버전은 파서의 데이터 계약이 바뀔 때 함께 올린다.
 */
export const fetchAssetRankingSnapshot = unstable_cache(
  collectAssetRanking,
  ["asset-ranking-v2", ASSET_RANKING_SOURCE_URL],
  { revalidate: ASSET_RANKING_REVALIDATE_SECONDS, tags: ["asset-ranking"] },
);
