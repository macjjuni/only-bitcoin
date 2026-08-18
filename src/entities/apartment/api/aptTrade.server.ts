import { unstable_cache } from "next/cache";
import { isSuccessfulAptTradeResponse, parseAptTradeXml } from "../lib/parseAptTradeXml";
import type { ApartmentTrade } from "../model/types";

/**
 * 국토교통부 아파트 매매 실거래가 조회 (서버 전용).
 *
 * 이 API 는 단지명으로 조회할 수 없고 **(시군구 × 1개월)** 단위로만 응답한다.
 * 단지 하나를 보려면 그 구의 모든 월을 긁어 `aptNm` 으로 걸러야 한다.
 *
 * 그래서 캐시 유닛을 응답 단위와 동일하게 `(지역코드 × 월)` 로 잡는다.
 * 같은 구의 다른 단지는 이 캐시를 100% 재사용하므로 두 번째 단지부터는 외부 호출이 0회다.
 */

const APT_TRADE_URL = "https://apis.data.go.kr/1613000/RTMSDataSvcAptTrade/getRTMSDataSvcAptTrade";

/** 한 달치는 999건이면 충분하다. 강남 3구 최대 월도 700건대. */
const MAX_ROWS_PER_MONTH = 999;

/** 공공 API 를 몰아치지 않도록 동시 요청을 제한한다. */
const FETCH_CONCURRENCY = 8;

/**
 * 신고 지연( 계약 후 최대 30일 )을 감안해 최근 몇 개월을 "미확정"으로 볼지.
 * 이 구간은 데이터가 계속 추가되므로 재검증 주기를 짧게 가져간다.
 */
const UNSETTLED_MONTH_COUNT = 3;

const DAYS_30_IN_SECONDS = 60 * 60 * 24 * 30;
const HOURS_6_IN_SECONDS = 60 * 60 * 6;

/** 'YYYYMM' */
export type DealYearMonth = string;

function toDealYearMonth(year: number, month: number): DealYearMonth {
  return `${year}${String(month).padStart(2, "0")}`;
}

/** 두 'YYYYMM' 사이의 개월 차이 */
function monthsBetween(from: DealYearMonth, to: DealYearMonth): number {
  const fromYear = Number(from.slice(0, 4));
  const fromMonth = Number(from.slice(4, 6));
  const toYear = Number(to.slice(0, 4));
  const toMonth = Number(to.slice(4, 6));

  return (toYear - fromYear) * 12 + (toMonth - fromMonth);
}

/** 현재 시점(KST) 기준 'YYYYMM' */
function getCurrentDealYearMonth(): DealYearMonth {
  const nowInSeoul = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
  }).format(new Date());

  return nowInSeoul.replace("-", "");
}

/**
 * 데이터가 확정된 월인지 여부.
 * 확정된 과거 월은 값이 변하지 않으므로 사실상 영구 캐시해도 된다.
 */
export function isSettledMonth(dealYearMonth: DealYearMonth): boolean {
  return monthsBetween(dealYearMonth, getCurrentDealYearMonth()) > UNSETTLED_MONTH_COUNT;
}

/**
 * 서비스 키를 URL 에 넣을 형태로 정규화한다.
 *
 * 공공데이터포털은 키를 **인코딩 / 디코딩 두 가지 형태**로 발급한다.
 * - 인코딩: `...yl%2BvRk...DqQ%3D%3D`
 * - 디코딩: `...yl+vRk...DqQ==`
 *
 * 인코딩된 키를 그대로 `encodeURIComponent` 하면 `%` 가 `%25` 가 되어 인증이 깨지고,
 * 디코딩된 키를 그대로 붙이면 `+` 가 공백으로 해석되어 역시 깨진다.
 * 한 번 디코딩해 원본으로 되돌린 뒤 다시 인코딩하면 어느 형태로 넣어도 동작한다.
 * ( Base64 원본에는 `%` 가 없으므로 디코딩이 값을 훼손하지 않는다 )
 */
export function normalizeServiceKey(rawServiceKey: string): string {
  try {
    return encodeURIComponent(decodeURIComponent(rawServiceKey));
  } catch {
    // 잘못된 `%` 시퀀스가 섞인 경우 디코딩을 건너뛴다.
    return encodeURIComponent(rawServiceKey);
  }
}

function buildAptTradeUrl(lawdCode: string, dealYearMonth: DealYearMonth): string {
  const serviceKey = normalizeServiceKey(process.env.DATA_GO_KR_SERVICE_KEY ?? "");

  const searchParams = new URLSearchParams({
    LAWD_CD: lawdCode,
    DEAL_YMD: dealYearMonth,
    pageNo: "1",
    numOfRows: String(MAX_ROWS_PER_MONTH),
  });

  return `${APT_TRADE_URL}?serviceKey=${serviceKey}&${searchParams.toString()}`;
}

/** 초당 요청 제한에 걸렸을 때 재시도 횟수 */
const MAX_FETCH_ATTEMPTS = 3;

/** 재시도 대기 시간 (지수 백오프) */
const RETRY_BASE_DELAY_MS = 400;

const delay = (milliseconds: number) => new Promise((resolve) => setTimeout(resolve, milliseconds));

/**
 * (지역코드 × 월) 한 칸을 실제로 조회한다.
 *
 * **실패하면 반드시 던진다.** 빈 배열로 흡수하면 안 된다.
 * 이 API 는 초당 요청 제한 초과를 `HTTP 200` + 에러 XML 본문으로 돌려준다.
 * ( `LIMITED_NUMBER_OF_SERVICE_REQUESTS_PER_SECOND_EXCEEDS_ERROR`, 코드 23 )
 * Next 의 `fetch` 캐시는 본문을 보지 않으므로, 이걸 정상 응답으로 캐시해버리면
 * 일시적인 초당 제한 한 번이 그 달을 30일 동안 "거래 없음" 으로 굳혀버린다.
 *
 * 그래서 `no-store` 로 받아 Next 가 원본 응답을 캐시하지 못하게 하고,
 * 캐싱은 성공했을 때만 값을 보관하는 `unstable_cache` 에 맡긴다.
 */
async function fetchMonthlyTradesFromApi(
  lawdCode: string,
  dealYearMonth: DealYearMonth,
): Promise<ApartmentTrade[]> {
  let lastErrorMessage = "";

  for (let attempt = 1; attempt <= MAX_FETCH_ATTEMPTS; attempt += 1) {
    try {
      const response = await fetch(buildAptTradeUrl(lawdCode, dealYearMonth), {
        cache: "no-store",
      });

      if (!response.ok) {
        lastErrorMessage = `HTTP ${response.status}`;
      } else {
        const xml = await response.text();

        if (isSuccessfulAptTradeResponse(xml)) {
          return parseAptTradeXml(xml);
        }

        lastErrorMessage = xml.includes("PER_SECOND") ? "초당 요청 제한 초과" : "응답 오류";
      }
    } catch (error) {
      lastErrorMessage = error instanceof Error ? error.message : "알 수 없는 오류";
    }

    if (attempt < MAX_FETCH_ATTEMPTS) {
      await delay(RETRY_BASE_DELAY_MS * 2 ** (attempt - 1));
    }
  }

  throw new Error(`실거래가 조회 실패 ${lawdCode}/${dealYearMonth}: ${lastErrorMessage}`);
}

/**
 * (지역코드 × 월) 한 칸. 이것이 캐시 유닛이다.
 *
 * `unstable_cache` 는 함수가 던지면 아무것도 보관하지 않으므로,
 * 실패한 달은 캐시를 오염시키지 않고 다음 요청에서 다시 시도된다.
 */
function fetchMonthlyTrades(
  lawdCode: string,
  dealYearMonth: DealYearMonth,
): Promise<ApartmentTrade[]> {
  const revalidate = isSettledMonth(dealYearMonth) ? DAYS_30_IN_SECONDS : HOURS_6_IN_SECONDS;

  return unstable_cache(
    () => fetchMonthlyTradesFromApi(lawdCode, dealYearMonth),
    ["apt-trade", lawdCode, dealYearMonth],
    { revalidate, tags: ["apt-trade"] },
  )();
}

/** 동시 실행 개수를 제한하며 순서대로 결과를 모은다. */
async function mapWithConcurrencyLimit<Item, Result>(
  items: Item[],
  limit: number,
  task: (item: Item) => Promise<Result>,
): Promise<Result[]> {
  const results = new Array<Result>(items.length);
  let nextIndex = 0;

  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (nextIndex < items.length) {
      const currentIndex = nextIndex;
      nextIndex += 1;
      results[currentIndex] = await task(items[currentIndex]);
    }
  });

  await Promise.all(workers);

  return results;
}

export interface YearlyTradesResult {
  trades: ApartmentTrade[];
  /** 실제로 조회한 마지막 월. 진행 중인 연도면 12보다 작다. */
  settledThroughMonth: number;
  isPartialYear: boolean;
  /**
   * 일부 월 조회에 실패해 집계가 불완전한지 여부.
   *
   * 실패한 달은 캐시되지 않으므로 다음 요청에서 다시 시도된다.
   * 클라이언트는 이 값을 보고 재조회하거나 "일부 데이터 누락" 을 표시할 수 있다.
   */
  isIncomplete: boolean;
}

/**
 * 한 단지가 아니라 **한 구의 1년치**를 모아 온다.
 *
 * 단지 필터링은 호출부가 맡는다. 이렇게 해야 같은 구의 다른 단지가
 * 동일한 `(지역코드 × 월)` 캐시를 그대로 재사용할 수 있다.
 */
export async function fetchDistrictYearlyTrades(
  lawdCode: string,
  year: number,
): Promise<YearlyTradesResult> {
  const currentYearMonth = getCurrentDealYearMonth();
  const currentYear = Number(currentYearMonth.slice(0, 4));
  const currentMonth = Number(currentYearMonth.slice(4, 6));

  const isPartialYear = year >= currentYear;
  const lastMonth = isPartialYear ? currentMonth : 12;

  const dealYearMonths = Array.from({ length: lastMonth }, (_, index) =>
    toDealYearMonth(year, index + 1),
  );

  /**
   * 한 달이 실패해도 나머지 11개월로 연 집계는 성립한다.
   * 그러나 그 사실을 숨기지는 않는다 — `isIncomplete` 로 올려보낸다.
   */
  const monthlyResults = await mapWithConcurrencyLimit(
    dealYearMonths,
    FETCH_CONCURRENCY,
    async (dealYearMonth) => {
      try {
        return await fetchMonthlyTrades(lawdCode, dealYearMonth);
      } catch (error) {
        console.warn(error instanceof Error ? error.message : error);
        return null;
      }
    },
  );

  const succeededResults = monthlyResults.filter(
    (trades): trades is ApartmentTrade[] => trades !== null,
  );

  return {
    trades: succeededResults.flat(),
    settledThroughMonth: lastMonth,
    isPartialYear,
    isIncomplete: succeededResults.length < monthlyResults.length,
  };
}
