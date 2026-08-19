// 공공 API 호출( 서비스 키 사용 )과 집계는 `@/entities/apartment/server` 에서 가져온다.
export {
  type ApartmentSeriesResult,
  useApartmentSeriesQuery,
} from "./api/useApartmentSeriesQuery";
export { toAreaBucket } from "./lib/aggregateTrades";
export { getApartmentImagePath } from "./lib/apartmentImage";
export type {
  ApartmentAreaBucket,
  ApartmentSeriesResponse,
  ApartmentYearPoint,
} from "./lib/buildApartmentSeries";
export {
  DEFAULT_APARTMENT_ID,
  findLandmarkApartment,
  landmarkApartmentList,
} from "./model/landmarks";
export {
  CHART_START_YEAR,
  type LandmarkApartment,
  NATIONAL_AREA_IN_SQUARE_METER,
  type PriceUnit,
} from "./model/types";
