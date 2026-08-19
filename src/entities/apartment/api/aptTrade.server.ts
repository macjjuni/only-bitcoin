import { unstable_cache } from "next/cache";
import {
  countItemElements,
  isSuccessfulAptTradeResponse,
  parseAptTradeXml,
  readTotalCount,
} from "../lib/parseAptTradeXml";
import { buildAptTradeUrl } from "../lib/serviceKey";
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

/** 초당 요청 제한에 걸렸을 때 재시도 횟수 */
const MAX_FETCH_ATTEMPTS = 3;

/** 재시도 대기 시간 (지수 백오프) */
const RETRY_BASE_DELAY_MS = 400;

const delay = (milliseconds: number) => new Promise((resolve) => setTimeout(resolve, milliseconds));

/**
 * 프로세스 전역 요청 간격 제한.
 *
 * 동시성만 제한해서는 부족하다. 클라이언트가 13개 연도를 동시에 요청하면
 * 라우트 핸들러가 13개 병렬로 뜨고, 각자 동시성 8을 쓰므로 순간 100회 이상이 나간다.
 * 공공 API 는 이를 초당 제한 초과로 막는다( 코드 23 ).
 *
 * 개별 요청의 동시성이 아니라 **프로세스 전체의 발사 간격**을 제한해야 한다.
 *
 * 152개월 연속 발사로 실측한 결과 25ms(34 req/s) 까지는 초당 제한에 걸리지 않았다.
 * 다만 서버리스에서 인스턴스가 여러 개 뜨면 각자 이 속도로 쏘므로 합산 속도는 배수가 된다.
 * 안전 마진을 두고 40ms(22 req/s) 로 잡는다 — 콜드 스타트 152회가 약 7초.
 */
const MIN_REQUEST_INTERVAL_MS = 40;

let lastRequestStartedAt = 0;
let requestQueueTail: Promise<void> = Promise.resolve();

/** 직전 요청 시작 시각으로부터 최소 간격이 지난 뒤에 실행되도록 순번을 잡는다. */
function scheduleRateLimited<T>(task: () => Promise<T>): Promise<T> {
  const slot = requestQueueTail.then(async () => {
    const waitMs = lastRequestStartedAt + MIN_REQUEST_INTERVAL_MS - Date.now();

    if (waitMs > 0) {
      await delay(waitMs);
    }

    lastRequestStartedAt = Date.now();
  });

  requestQueueTail = slot.catch(() => undefined);

  return slot.then(task);
}

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
async function fetchTradePageXml(
  lawdCode: string,
  dealYearMonth: DealYearMonth,
  pageNo: number,
): Promise<string> {
  let lastErrorMessage = "";

  for (let attempt = 1; attempt <= MAX_FETCH_ATTEMPTS; attempt += 1) {
    try {
      const response = await scheduleRateLimited(() =>
        fetch(
          buildAptTradeUrl(
            process.env.DATA_GO_KR_SERVICE_KEY ?? "",
            lawdCode,
            dealYearMonth,
            pageNo,
          ),
          { cache: "no-store" },
        ),
      );

      if (!response.ok) {
        lastErrorMessage = `HTTP ${response.status}`;
      } else {
        const xml = await response.text();

        if (isSuccessfulAptTradeResponse(xml)) {
          return xml;
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

  throw new Error(
    `실거래가 조회 실패 ${lawdCode}/${dealYearMonth} p${pageNo}: ${lastErrorMessage}`,
  );
}

/**
 * 무한 페이징 방어. `MAX_ROWS_PER_PAGE` 가 3,000 이고 실측 최대가 1,320건이므로
 * 정상 상황에서 2페이지를 넘길 일이 없다.
 */
const MAX_PAGES_PER_MONTH = 5;

async function fetchMonthlyTradesFromApi(
  lawdCode: string,
  dealYearMonth: DealYearMonth,
): Promise<ApartmentTrade[]> {
  const trades: ApartmentTrade[] = [];
  let receivedItemCount = 0;

  for (let pageNo = 1; pageNo <= MAX_PAGES_PER_MONTH; pageNo += 1) {
    const xml = await fetchTradePageXml(lawdCode, dealYearMonth, pageNo);
    const itemCount = countItemElements(xml);

    trades.push(...parseAptTradeXml(xml));
    receivedItemCount += itemCount;

    // 다 받았거나, 빈 페이지가 나왔으면 끝이다.
    if (receivedItemCount >= readTotalCount(xml) || itemCount === 0) {
      return trades;
    }
  }

  throw new Error(
    `실거래가 페이지 한도 초과 ${lawdCode}/${dealYearMonth}: ${MAX_PAGES_PER_MONTH}페이지로 부족`,
  );
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

export interface YearMeta {
  year: number;
  /** 집계가 끝난 마지막 월. 진행 중인 연도면 12보다 작다. */
  settledThroughMonth: number;
  isPartialYear: boolean;
}

export interface DistrictTradesResult {
  trades: ApartmentTrade[];
  years: YearMeta[];
  /**
   * 일부 월 조회에 실패해 집계가 불완전한지 여부.
   *
   * 실패한 달은 캐시되지 않으므로 다음 요청에서 다시 시도된다.
   * 클라이언트는 이 값을 보고 재조회하거나 "일부 데이터 누락" 을 표시할 수 있다.
   */
  isIncomplete: boolean;
}

/**
 * 한 구의 **여러 해치를 한 번에** 모아 온다.
 *
 * 연도별로 쪼개 라우트를 나누지 않는 이유:
 * 서버리스에서는 요청마다 인스턴스가 분리될 수 있어 `scheduleRateLimited` 의
 * 전역 발사 간격이 서로에게 적용되지 않는다. 13개 연도를 13개 요청으로 나누면
 * 각자 자기 페이스로 쏘아 공공 API 의 초당 제한에 걸린다.
 * 한 요청 안에서 전체 월을 하나의 큐로 흘려보내야 페이싱이 실제로 동작한다.
 *
 * 단지 필터링은 호출부가 맡는다. 그래야 같은 구의 다른 단지가
 * 동일한 `(지역코드 × 월)` 캐시를 그대로 재사용할 수 있다.
 */
export async function fetchDistrictTrades(
  lawdCode: string,
  startYear: number,
): Promise<DistrictTradesResult> {
  const currentYearMonth = getCurrentDealYearMonth();
  const currentYear = Number(currentYearMonth.slice(0, 4));
  const currentMonth = Number(currentYearMonth.slice(4, 6));

  const years: YearMeta[] = [];
  const dealYearMonths: DealYearMonth[] = [];

  for (let year = startYear; year <= currentYear; year += 1) {
    const isPartialYear = year === currentYear;
    const lastMonth = isPartialYear ? currentMonth : 12;

    years.push({ year, settledThroughMonth: lastMonth, isPartialYear });

    for (let month = 1; month <= lastMonth; month += 1) {
      dealYearMonths.push(toDealYearMonth(year, month));
    }
  }

  /**
   * 한 달이 실패해도 나머지로 집계는 성립한다.
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
    years,
    isIncomplete: succeededResults.length < monthlyResults.length,
  };
}
