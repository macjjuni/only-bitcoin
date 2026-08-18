import type { ApartmentTrade, LandmarkApartment } from "../model/types";
import { calculateMedian, filterLandmarkTrades, groupTradesByAreaBucket } from "./aggregateTrades";
import { type BtcDailyKrwMap, convertTradesToBtcMedian } from "./convertDealsToBtc";

/** 응답의 평형 버킷 한 칸 ( 해당 연도 단일 값 ) */
export interface ApartmentYearAreaBucket {
  areaInSquareMeter: number;
  medianPriceInKrw: number | null;
  medianPriceInBtc: number | null;
  dealCount: number;
  btcConvertedDealCount: number;
}

export interface ApartmentYearResponse {
  apartmentID: string;
  displayName: string;
  year: number;
  isPartialYear: boolean;
  /** 집계가 끝난 마지막 월. 진행 중인 연도면 12보다 작다. */
  settledThroughMonth: number;
  /** 단지 고유의 기본 선택 평형 ( 연도와 무관하게 고정 ) */
  defaultAreaInSquareMeter: number;
  /** 일부 월 조회 실패로 집계가 불완전한지 여부 */
  isIncomplete: boolean;
  areaBuckets: ApartmentYearAreaBucket[];
}

export interface BuildApartmentYearParams {
  landmark: LandmarkApartment;
  year: number;
  /** 해당 구 1년치 전체 거래 ( 단지 필터링 전 ) */
  districtTrades: ApartmentTrade[];
  btcDailyKrwMap: BtcDailyKrwMap;
  settledThroughMonth: number;
  isPartialYear: boolean;
  isIncomplete: boolean;
}

/**
 * 한 단지의 한 연도를 집계해 응답 형태로 만든다.
 *
 * fetch 를 하지 않는 순수 함수다. 데이터 수집은 `app` 레이어(라우트 핸들러)가 맡고,
 * 이 함수는 받은 거래와 시세만 조합한다.
 * ( `entities/apartment` 가 `entities/bitcoin` 을 직접 참조하면 동일 레이어 간 cross-import 가 된다 )
 *
 * 원시 거래 목록은 절대 응답에 담지 않는다. 거래일 단위 BTC 환산은 개별 거래가 있어야
 * 가능한데, 그걸 클라이언트로 내리면 연도당 수백 건이 페이로드에 실려 집계의 의미가 사라진다.
 * 그래서 환산까지 서버에서 끝내고 KRW·BTC 두 값을 함께 내려보낸다.
 */
export function buildApartmentYear({
  landmark,
  year,
  districtTrades,
  btcDailyKrwMap,
  settledThroughMonth,
  isPartialYear,
  isIncomplete,
}: BuildApartmentYearParams): ApartmentYearResponse {
  const landmarkTrades = filterLandmarkTrades(districtTrades, landmark);
  const groupedByArea = groupTradesByAreaBucket(landmarkTrades);

  const areaBuckets: ApartmentYearAreaBucket[] = [];

  for (const [areaInSquareMeter, trades] of groupedByArea) {
    const { medianPriceInBtc, convertedDealCount } = convertTradesToBtcMedian(
      trades,
      btcDailyKrwMap,
    );

    areaBuckets.push({
      areaInSquareMeter,
      medianPriceInKrw: calculateMedian(trades.map((trade) => trade.priceInKrw)),
      medianPriceInBtc,
      dealCount: trades.length,
      btcConvertedDealCount: convertedDealCount,
    });
  }

  areaBuckets.sort((left, right) => left.areaInSquareMeter - right.areaInSquareMeter);

  return {
    apartmentID: landmark.apartmentID,
    displayName: landmark.displayName,
    year,
    isPartialYear,
    settledThroughMonth,
    /**
     * 기본 평형은 `landmarks.ts` 에 고정된 값을 쓴다.
     *
     * 연도별 거래로 매번 계산하면 표본이 얇은 단지에서 해마다 값이 바뀐다.
     * 타워팰리스1 은 84㎡ 비중이 경계선(약 10%)이라 2021→164, 2022→84, 2024→164 로 흔들렸다.
     * 연도별로 응답을 받아 합치는 구조에서 기본 평형이 연도마다 다르면 클라이언트가
     * 어느 값을 써야 할지 알 수 없다. 단지 고유 속성이므로 화이트리스트에 고정한다.
     */
    defaultAreaInSquareMeter: landmark.defaultAreaInSquareMeter,
    isIncomplete,
    areaBuckets,
  };
}
