// 공공 API 호출( 서비스 키 사용 )과 연도 집계는 `@/entities/apartment/server` 에서 가져온다.
export {
  type ApartmentSeriesResult,
  useApartmentSeriesQuery,
} from "./api/useApartmentSeriesQuery";
export { toAreaBucket } from "./lib/aggregateTrades";
export type {
  ApartmentYearAreaBucket,
  ApartmentYearResponse,
} from "./lib/buildApartmentYear";
export {
  DEFAULT_APARTMENT_ID,
  findLandmarkApartment,
  landmarkApartmentList,
} from "./model/landmarks";
export {
  type ApartmentPricePoint,
  type AreaBucket,
  CHART_START_YEAR,
  type LandmarkApartment,
  NATIONAL_AREA_IN_SQUARE_METER,
  type PriceUnit,
} from "./model/types";
