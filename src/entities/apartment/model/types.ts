/** 차트 Y축 단위 */
export type PriceUnit = "BTC" | "KRW";

/**
 * 차트 시작 연도.
 *
 * 2014년 이전을 포함하면 BTC 환산값 편차가 4,000배까지 벌어져( 2011년 8만 BTC vs 2025년 21 BTC )
 * 최근 구간이 바닥에 깔려 읽히지 않는다. 2014년부터면 90배로 줄어 선형 축으로도 읽힌다.
 * 국내 거래소가 자리 잡기 전( ~2013 ) 원화 시세가 신뢰 구간이 아니라는 점과도 맞물린다.
 */
export const CHART_START_YEAR = 2014;

/**
 * 기본 평형을 84㎡ 로 잡기 위한 최소 거래 비중.
 *
 * 단순히 "84 버킷이 있으면 84" 로 하면 대형 위주 단지가 깨진다.
 * 타워팰리스1 은 84㎡ 비중이 3.8% 라 대부분의 연도가 거래 0건이 되어 막대가 그려지지 않는다.
 */
export const DEFAULT_AREA_MIN_DEAL_RATIO = 0.1;

/** 국민평형( 전용 84㎡ ) 버킷 값 */
export const NATIONAL_AREA_IN_SQUARE_METER = 84;

/** 랜드마크 단지 화이트리스트 항목 */
export interface LandmarkApartment {
  /** URL 및 쿼리 키에 쓰이는 식별자 */
  apartmentID: string;
  /** 화면에 노출할 단지명 */
  displayName: string;
  /** 법정동코드 앞 5자리( 시군구 ) */
  lawdCode: string;
  /** '서울 서초구' */
  districtName: string;
  /** '반포동' */
  legalDongName: string;
  /**
   * 공공 API 응답의 `aptNm` 과 **정확일치**로 비교할 단지명 목록.
   *
   * 부분일치를 쓰면 `아크로리버파크` 에 `아크로리버뷰신반포`·`방배아크로리버` 가,
   * `반포자이` 에 `신반포자이` 가 섞인다.
   * 마포래미안푸르지오처럼 하나의 단지가 여러 표기로 쪼개진 경우에만 배열이 2개 이상이 된다.
   */
  aptNames: string[];
  /** 동명이단지 방어용 지번. 비어 있으면 지번 검증을 건너뛴다. */
  jibunList: string[];
  /** 첫 실거래가 발생한 연도. 이전 구간은 조회하지 않아 불필요한 외부 호출을 막는다. */
  earliestDealYear: number;
}

/** 집계된 시계열 한 점 ( = 막대 하나 ) */
export interface ApartmentPricePoint {
  year: number;
  /** 거래가 없으면 null. 0 으로 채우면 그 해에 공짜였던 것처럼 읽힌다. */
  medianPriceInKrw: number | null;
  /** 거래일별로 환산한 BTC 개수의 중앙값. 시세를 못 구하면 null. */
  medianPriceInBtc: number | null;
  /** KRW 집계에 쓰인 거래 건수 */
  dealCount: number;
  /** BTC 집계에 쓰인 거래 건수 ( 시세 결측분 제외 ) */
  btcConvertedDealCount: number;
  /** 아직 12개월이 다 차지 않은 진행 중인 연도 */
  isPartialYear: boolean;
}

/** 전용면적 버킷( `Math.floor(excluUseAr)` 기준 ) */
export interface AreaBucket {
  areaInSquareMeter: number;
  totalDealCount: number;
  points: ApartmentPricePoint[];
}

/** 공공 API 에서 파싱한 개별 실거래. 서버 내부에서만 다루고 클라이언트로 내려보내지 않는다. */
export interface ApartmentTrade {
  aptName: string;
  legalDongName: string;
  jibun: string;
  /** 전용면적( ㎡ ). 버킷팅 전 원본값 */
  exclusiveAreaInSquareMeter: number;
  priceInKrw: number;
  /** 'YYYY-MM-DD' */
  dealDate: string;
  dealYear: number;
  floor: number;
  /** '중개거래' | '직거래' */
  dealingType: string;
}
