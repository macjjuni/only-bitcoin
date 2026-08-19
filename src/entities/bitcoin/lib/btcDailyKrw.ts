/**
 * 연도별 BTC 원화 일별 시세 조회 ( Next 비의존 순수 모듈 ).
 *
 * 아파트 실거래를 **거래일 시세**로 환산하려면 일별 해상도가 필요하다.
 * 연평균·연말종가 같은 연도 대표값으로 나누면 은마 2021 기준 -15%, 2018 기준 +95% 어긋난다.
 *
 * 주 소스는 **빗썸 일봉**이다. 2013-12-27 부터 있어 차트 시작인 2014년을 덮는다.
 *
 * 업비트가 아니라 빗썸을 쓰는 이유는 **일봉 마감 시각**이다.
 *   빗썸   utc 2020-03-11T15:00 | kst 2020-03-12T00:00  → KST 자정 마감
 *   업비트  utc 2020-03-12T00:00 | kst 2020-03-12T09:00  → UTC 자정 마감
 * 업비트의 `candle_date_time_kst` 는 UTC 자정을 KST 로 표기한 것일 뿐 실제 일봉은
 * UTC 기준이다. 아파트 계약일은 KST 날짜이므로 그대로 쓰면 종가가 9시간 밀린다.
 * 급등락일에 두 소스가 최대 21% 벌어지고( 2020-03-12 코로나 폭락: 770만 vs 636만 ),
 * 3% 넘게 벌어지는 날이 전체의 9.5% 였다.
 *
 * 2017년 이전을 blockchain.com USD × 환율로 환산하던 방식도 함께 걷어냈다.
 * 그 방식은 국내 프리미엄을 반영하지 못해 2017년 중앙 -4.2%, 최악 -41.5%
 * ( 2017-05-25, 김치프리미엄 정점 ) 어긋났다. 빗썸은 국내 원화 시세 그 자체다.
 *
 * **실패를 빈 Map 으로 흡수하지 않는다.** 초기 구현이 `continue` 로 넘겼다가
 * 초당 제한에 걸린 응답이 조용히 버려져, 아카이브 622개 버킷 중 290개가
 * BTC 시세 결측 상태로 생성됐다. 부분적으로 채워진 Map 은 "일부 거래만 환산된
 * 중앙값" 이라는 조용히 틀린 값을 만든다. 차라리 던져서 재시도하게 한다.
 */

const BITHUMB_CANDLE_URL = "https://api.bithumb.com/v1/candles/days";
const BLOCKCHAIN_MARKET_PRICE_URL = "https://api.blockchain.info/charts/market-price";

/** 빗썸 일봉이 존재하는 첫 날. 이 이전 연도는 어떤 소스로도 채울 수 없다. */
const BITHUMB_FIRST_TRADING_DATE = "2013-12-27";

/** 빗썸 일봉 한 번에 가져올 수 있는 최대 개수 */
const BITHUMB_MAX_COUNT = 200;

/** 연속 호출 사이 간격. 초당 제한을 피한다. */
const BITHUMB_REQUEST_INTERVAL_MS = 200;

const MAX_FETCH_ATTEMPTS = 3;
const RETRY_BASE_DELAY_MS = 500;

/**
 * 한 해가 채워졌다고 인정할 최소 일수.
 *
 * 윤년·거래정지 등을 감안해 여유를 두되, 절반만 채워진 Map 이 통과하지는 않게 한다.
 */
const MIN_COVERAGE_RATIO = 0.95;

/**
 * 연평균 원/달러 환율. **폴백 전용**이다.
 *
 * 빗썸에는 거래소 중단으로 보이는 연속 결측이 두 군데 있다.
 *   2014-05-17 ~ 07-01 ( 46일 )
 *   2015-07-01 ~ 08-14 ( 45일 )
 * 45일 넘는 구멍은 `findBtcPriceOnDate` 의 10일 소급으로 못 메운다. 그대로 두면
 * 강남구 기준 2014년 거래의 7.7%, 2015년의 7.9% 가 BTC 환산에서 탈락한다.
 * 이 구간만 blockchain.com USD 시세 × 연평균 환율로 채운다.
 *
 * 환율은 연중 ±5% 수준으로 움직이는 데 반해 같은 기간 BTC 는 수백 % 움직이므로,
 * 일별 환율 대신 연평균 상수를 써도 폴백 구간의 오차 기여도는 무시할 수준이다.
 * ( 2016년부터는 빗썸이 100% 커버하므로 이 표를 쓸 일이 없다 )
 */
const YEARLY_AVERAGE_USD_KRW: Record<number, number> = {
  2014: 1053,
  2015: 1131,
  2016: 1161,
  2017: 1131,
};

interface BithumbDailyCandle {
  candle_date_time_kst: string;
  trade_price: number;
}

interface BlockchainChartPoint {
  x: number;
  y: number;
}

interface BlockchainChartResponse {
  values: BlockchainChartPoint[];
}

/** 'YYYY-MM-DD' → 그 날의 BTC 원화 종가 */
export type BtcDailyKrwMap = ReadonlyMap<string, number>;

const delay = (milliseconds: number) => new Promise((resolve) => setTimeout(resolve, milliseconds));

/** 그 해에 데이터가 있어야 할 일수. 진행 중인 연도면 오늘까지만 센다. */
function countExpectedDays(year: number, now: Date): number {
  const startOfYear = Date.UTC(year, 0, 1);
  const endOfYear = Date.UTC(year + 1, 0, 1);
  const end = Math.min(
    endOfYear,
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
  );

  if (end <= startOfYear) {
    return 0;
  }

  return Math.round((end - startOfYear) / 86_400_000);
}

/** 재시도하며 JSON 을 받아 온다. 끝내 실패하면 던진다. */
async function fetchJsonWithRetry<T>(url: string, label: string): Promise<T> {
  let lastErrorMessage = "";

  for (let attempt = 1; attempt <= MAX_FETCH_ATTEMPTS; attempt += 1) {
    try {
      const response = await fetch(url, {
        cache: "no-store",
        headers: { accept: "application/json" },
      });

      if (response.ok) {
        return (await response.json()) as T;
      }

      lastErrorMessage = `HTTP ${response.status}`;
    } catch (error) {
      lastErrorMessage = error instanceof Error ? error.message : "알 수 없는 오류";
    }

    if (attempt < MAX_FETCH_ATTEMPTS) {
      await delay(RETRY_BASE_DELAY_MS * 2 ** (attempt - 1));
    }
  }

  throw new Error(`BTC 시세 조회 실패 (${label}): ${lastErrorMessage}`);
}

/**
 * 빗썸 일봉으로 한 해를 채운다.
 *
 * `count` 상한이 200이라 한 해를 두 번에 나눠 받는다.
 * `to` 는 KST 기준이고 **그 시각의 캔들은 제외**되므로, 구간 경계 다음 날을 넘긴다.
 * 두 요청이 각각 12/31~6/15, 7/1~12/14 를 덮어 한 해가 빈틈없이 이어진다.
 */
async function fetchBithumbYearMap(year: number): Promise<Map<string, number>> {
  const dailyMap = new Map<string, number>();
  const requestRanges = [`${year}-07-02 00:00:00`, `${year + 1}-01-01 00:00:00`];

  for (const [index, to] of requestRanges.entries()) {
    if (index > 0) {
      await delay(BITHUMB_REQUEST_INTERVAL_MS);
    }

    const candles = await fetchJsonWithRetry<BithumbDailyCandle[]>(
      `${BITHUMB_CANDLE_URL}?market=KRW-BTC&to=${encodeURIComponent(to)}&count=${BITHUMB_MAX_COUNT}`,
      `빗썸 ${year} ~${to.slice(0, 10)}`,
    );

    if (!Array.isArray(candles)) {
      throw new Error(`BTC 시세 응답 형식 오류 (빗썸 ${year}): 배열이 아님`);
    }

    for (const candle of candles) {
      const dateKey = candle.candle_date_time_kst.slice(0, 10);

      if (dateKey.startsWith(String(year)) && candle.trade_price > 0) {
        dailyMap.set(dateKey, candle.trade_price);
      }
    }
  }

  return dailyMap;
}

/**
 * 빗썸이 비워 둔 날짜만 blockchain.com USD × 연평균 환율로 채운다.
 *
 * `timespan=all` 은 4일 간격으로만 내려와( 17년치가 1,609건 ) 거래일 매칭에 쓸 수 없다.
 * 반드시 `timespan=1year&start=` 로 연 단위 요청해야 366건 일별로 온다.
 *
 * **이미 있는 날짜는 덮어쓰지 않는다.** 빗썸 값이 국내 실제 체결가라 항상 우선이다.
 */
async function fillGapsFromBlockchain(dailyMap: Map<string, number>, year: number): Promise<void> {
  const exchangeRate = YEARLY_AVERAGE_USD_KRW[year];

  if (!exchangeRate) {
    throw new Error(`연평균 환율이 없는 연도입니다: ${year}`);
  }

  const searchParams = new URLSearchParams({
    timespan: "1year",
    start: `${year}-01-01`,
    format: "json",
    cors: "true",
  });

  const chart = await fetchJsonWithRetry<BlockchainChartResponse>(
    `${BLOCKCHAIN_MARKET_PRICE_URL}?${searchParams.toString()}`,
    `blockchain.com ${year}`,
  );

  if (!Array.isArray(chart?.values)) {
    throw new Error(`BTC 시세 응답 형식 오류 (blockchain.com ${year})`);
  }

  for (const point of chart.values) {
    const dateKey = new Date(point.x * 1000).toISOString().slice(0, 10);

    if (dateKey.startsWith(String(year)) && point.y > 0 && !dailyMap.has(dateKey)) {
      dailyMap.set(dateKey, point.y * exchangeRate);
    }
  }
}

/**
 * 한 해의 BTC 원화 일별 시세를 조회한다.
 *
 * 빗썸으로 채우고, 커버리지가 모자랄 때만 blockchain.com 으로 구멍을 메운다.
 * 2016년 이후는 빗썸이 100% 덮으므로 폴백 요청이 아예 나가지 않는다.
 *
 * 그래도 모자라면 던진다. 부분적으로 채워진 Map 을 돌려주면
 * "일부 거래만 환산된 중앙값" 이라는 조용히 틀린 값이 만들어진다.
 */
export async function fetchBtcDailyKrwMap(year: number, now = new Date()): Promise<BtcDailyKrwMap> {
  if (year < Number(BITHUMB_FIRST_TRADING_DATE.slice(0, 4))) {
    throw new Error(
      `BTC 원화 시세가 없는 연도입니다 (${year}): 빗썸 최초 일봉은 ${BITHUMB_FIRST_TRADING_DATE}`,
    );
  }

  const dailyMap = await fetchBithumbYearMap(year);

  const expectedDays = countExpectedDays(year, now);
  const minimumDays = Math.floor(expectedDays * MIN_COVERAGE_RATIO);

  if (dailyMap.size < minimumDays) {
    await fillGapsFromBlockchain(dailyMap, year);
  }

  if (dailyMap.size < minimumDays) {
    throw new Error(
      `BTC 시세 커버리지 부족 (${year}): ${dailyMap.size}일 / 최소 ${minimumDays}일 필요`,
    );
  }

  return dailyMap;
}
