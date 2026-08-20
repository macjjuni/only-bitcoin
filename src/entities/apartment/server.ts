/**
 * 서버 전용 공개 API.
 *
 * 공공데이터포털 서비스 키를 읽는 모듈만 노출한다. 라우트 핸들러에서만 호출되며,
 * 클라이언트 번들에 섞이지 않도록 기본 배럴(`index.ts`)과 분리.
 *
 * BTC 시세와의 조합은 `app` 레이어에서, 이 엔티티는 `entities/bitcoin` 을 참조하지 않음.
 */
export {
  type DistrictTradesResult,
  fetchDistrictTrades,
  getCurrentSeoulYear,
} from "./api/aptTrade.server";
export {
  ARCHIVE_GENERATED_AT,
  getArchivedYearPoints,
  resolveRuntimeStartYear,
} from "./lib/archive";
export { buildYearPoints, composeApartmentSeries } from "./lib/buildApartmentSeries";
