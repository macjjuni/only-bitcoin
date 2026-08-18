// 공공 API 호출( 서비스 키 사용 )은 `@/entities/apartment/server` 에서 가져온다.
export { toAreaBucket } from "./lib/aggregateTrades";
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
