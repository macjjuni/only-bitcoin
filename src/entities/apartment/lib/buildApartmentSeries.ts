import type { ApartmentTrade, LandmarkApartment } from "../model/types";
import { calculateMedian, filterLandmarkTrades, groupTradesByAreaBucket } from "./aggregateTrades";
import { type BtcDailyKrwMap, convertTradesToBtcMedian } from "./convertDealsToBtc";

/** 응답의 평형 버킷 한 칸 ( 해당 연도 단일 값 ) */
export interface ApartmentAreaBucket {
  areaInSquareMeter: number;
  medianPriceInKrw: number | null;
  medianPriceInBtc: number | null;
  dealCount: number;
  btcConvertedDealCount: number;
}

/** 시계열 한 점 ( = 막대 하나 ) */
export interface ApartmentYearPoint {
  year: number;
  isPartialYear: boolean;
  /** 집계가 끝난 마지막 월. 진행 중인 연도면 12보다 작다. */
  settledThroughMonth: number;
  areaBuckets: ApartmentAreaBucket[];
}

export interface ApartmentSeriesResponse {
  apartmentID: string;
  displayName: string;
  /** 단지 고유의 기본 선택 평형 ( 연도와 무관하게 고정 ) */
  defaultAreaInSquareMeter: number;
  /** 이 단지가 실제로 거래된 평형 버킷 ( 오름차순 ) */
  availableAreas: number[];
  /** 일부 월 조회 실패로 집계가 불완전한지 여부 */
  isIncomplete: boolean;
  years: ApartmentYearPoint[];
}

export interface BuildYearPointsParams {
  landmark: LandmarkApartment;
  /** 해당 구의 거래 ( 단지 필터링 전 ) */
  districtTrades: ApartmentTrade[];
  years: Array<{ year: number; settledThroughMonth: number; isPartialYear: boolean }>;
  /** 연도 → 그 해의 일별 BTC 원화 시세 */
  btcDailyKrwMapByYear: ReadonlyMap<number, BtcDailyKrwMap>;
}

/**
 * 거래를 연도별 시계열 점으로 집계한다.
 *
 * fetch 를 하지 않는 순수 함수다. 데이터 수집은 `app` 레이어(라우트 핸들러)와
 * 아카이브 생성 스크립트가 맡고, 이 함수는 받은 거래와 시세만 조합한다.
 * ( `entities/apartment` 가 `entities/bitcoin` 을 직접 참조하면 동일 레이어 간 cross-import 가 된다 )
 *
 * 원시 거래 목록은 절대 결과에 담지 않는다. 거래일 단위 BTC 환산은 개별 거래가 있어야
 * 가능한데, 그걸 클라이언트로 내리면 수천 건이 페이로드에 실려 집계의 의미가 사라진다.
 */
export function buildYearPoints({
  landmark,
  districtTrades,
  years,
  btcDailyKrwMapByYear,
}: BuildYearPointsParams): ApartmentYearPoint[] {
  const landmarkTrades = filterLandmarkTrades(districtTrades, landmark);

  const tradesByYear = new Map<number, ApartmentTrade[]>();

  for (const trade of landmarkTrades) {
    const yearTrades = tradesByYear.get(trade.dealYear);

    if (yearTrades) {
      yearTrades.push(trade);
      continue;
    }

    tradesByYear.set(trade.dealYear, [trade]);
  }

  return years.map<ApartmentYearPoint>(({ year, settledThroughMonth, isPartialYear }) => {
    const yearTrades = tradesByYear.get(year) ?? [];
    const btcDailyKrwMap = btcDailyKrwMapByYear.get(year) ?? new Map<string, number>();
    const areaBuckets: ApartmentAreaBucket[] = [];

    for (const [areaInSquareMeter, trades] of groupTradesByAreaBucket(yearTrades)) {
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

    return { year, isPartialYear, settledThroughMonth, areaBuckets };
  });
}

/**
 * 아카이브 구간과 런타임 조회 구간을 합쳐 최종 응답을 만든다.
 *
 * 과거 확정 연도는 `archive.json` 에서 오고, 그 이후만 공공 API 로 조회한다.
 * 두 출처의 연도가 겹치면 **런타임 쪽을 우선**한다 — 아카이브가 낡았을 수 있기 때문이다.
 */
export function composeApartmentSeries(
  landmark: LandmarkApartment,
  yearPointGroups: ApartmentYearPoint[][],
  isIncomplete: boolean,
): ApartmentSeriesResponse {
  const yearPointByYear = new Map<number, ApartmentYearPoint>();

  for (const yearPoints of yearPointGroups) {
    for (const yearPoint of yearPoints) {
      yearPointByYear.set(yearPoint.year, yearPoint);
    }
  }

  const years = [...yearPointByYear.values()].sort((left, right) => left.year - right.year);

  const availableAreas = new Set<number>();

  for (const yearPoint of years) {
    for (const bucket of yearPoint.areaBuckets) {
      availableAreas.add(bucket.areaInSquareMeter);
    }
  }

  return {
    apartmentID: landmark.apartmentID,
    displayName: landmark.displayName,
    /**
     * 기본 평형은 `landmarks.ts` 에 고정된 값을 쓴다.
     *
     * 연도별 거래로 매번 계산하면 표본이 얇은 단지에서 해마다 값이 바뀐다.
     * 타워팰리스1 은 84㎡ 비중이 경계선(약 10%)이라 2021→164, 2022→84, 2024→164 로 흔들렸다.
     */
    defaultAreaInSquareMeter: landmark.defaultAreaInSquareMeter,
    availableAreas: [...availableAreas].sort((left, right) => left - right),
    isIncomplete,
    years,
  };
}
