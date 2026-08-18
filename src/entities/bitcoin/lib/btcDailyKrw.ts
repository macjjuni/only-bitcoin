/**
 * 연도별 BTC 원화 일별 시세 조회 ( Next 비의존 순수 모듈 ).
 *
 * 아파트 실거래를 **거래일 시세**로 환산하려면 일별 해상도가 필요하다.
 * 연평균·연말종가 같은 연도 대표값으로 나누면 은마 2021 기준 -15%, 2018 기준 +95% 어긋난다.
 *
 * 소스가 구간별로 갈린다.
 * - 2018 이후: Upbit KRW-BTC 일봉 ( 원화 직접 )
 * - 2017 이전: blockchain.com USD 일별 × 연평균 환율
 *
 * Upbit 은 2017-10 이전 데이터가 없어( 실제 조회로 확인 ) 그 이전 구간을 채울 수 없다.
 * 2017년은 경계에 걸쳐 있어 소스를 섞지 않고 blockchain.com 으로 통일한다.
 *
 * **실패를 빈 Map 으로 흡수하지 않는다.** 초기 구현이 `continue` 로 넘겼다가
 * Upbit 초당 제한에 걸린 응답이 조용히 버려져, 아카이브 622개 버킷 중 290개가
 * BTC 시세 결측 상태로 생성됐다. 부분적으로 채워진 Map 은 "일부 거래만 환산된
 * 중앙값" 이라는 조용히 틀린 값을 만든다. 차라리 던져서 재시도하게 한다.
 */

const UPBIT_CANDLE_URL = "https://api.upbit.com/v1/candles/days";
const BLOCKCHAIN_MARKET_PRICE_URL = "https://api.blockchain.info/charts/market-price";

/** Upbit 일봉이 신뢰할 만하게 존재하는 첫 연도 */
const UPBIT_AVAILABLE_FROM_YEAR = 2018;

/** Upbit 일봉 한 번에 가져올 수 있는 최대 개수 */
const UPBIT_MAX_COUNT = 200;

/** Upbit 는 초당 요청 제한이 빡빡하다. 연속 호출 사이에 간격을 둔다. */
const UPBIT_REQUEST_INTERVAL_MS = 250;

const MAX_FETCH_ATTEMPTS = 3;
const RETRY_BASE_DELAY_MS = 500;

/**
 * 한 해가 채워졌다고 인정할 최소 일수.
 *
 * 윤년·거래정지 등을 감안해 여유를 두되, 절반만 채워진 Map 이 통과하지는 않게 한다.
 */
const MIN_COVERAGE_RATIO = 0.95;

/**
 * 연평균 원/달러 환율.
 *
 * blockchain.com 은 USD 시세만 주므로 원화 환산에 필요하다.
 * 환율은 연중 ±5% 수준으로 움직이는 데 반해 같은 기간 BTC 는 수백 % 움직이므로,
 * 일별 환율 대신 연평균 상수를 써도 환산 오차 기여도가 무시할 수준이다.
 */
const YEARLY_AVERAGE_USD_KRW: Record<number, number> = {
  2014: 1053,
  2015: 1131,
  2016: 1161,
  2017: 1131,
};

interface UpbitDailyCandle {
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
      const response = await fetch(url, { cache: "no-store" });

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
 * Upbit 일봉으로 한 해를 채운다.
 *
 * `count` 상한이 200이라 한 해를 두 번에 나눠 받는다.
 * `to` 는 배타적 상한이므로 다음 구간 시작일을 넘긴다.
 */
async function fetchUpbitYearMap(year: number): Promise<Map<string, number>> {
  const dailyMap = new Map<string, number>();
  const requestRanges = [`${year}-07-02T00:00:00Z`, `${year + 1}-01-01T00:00:00Z`];

  for (const [index, to] of requestRanges.entries()) {
    if (index > 0) {
      await delay(UPBIT_REQUEST_INTERVAL_MS);
    }

    const candles = await fetchJsonWithRetry<UpbitDailyCandle[]>(
      `${UPBIT_CANDLE_URL}?market=KRW-BTC&count=${UPBIT_MAX_COUNT}&to=${to}`,
      `Upbit ${year} ~${to.slice(0, 10)}`,
    );

    if (!Array.isArray(candles)) {
      throw new Error(`BTC 시세 응답 형식 오류 (Upbit ${year}): 배열이 아님`);
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
 * blockchain.com USD 일별 시세로 한 해를 채운다.
 *
 * `timespan=all` 은 4일 간격으로만 내려와( 17년치가 1,609건 ) 거래일 매칭에 쓸 수 없다.
 * 반드시 `timespan=1year&start=` 로 연 단위 요청해야 366건 일별로 온다.
 */
async function fetchBlockchainYearMap(year: number): Promise<Map<string, number>> {
  const dailyMap = new Map<string, number>();
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

    if (dateKey.startsWith(String(year)) && point.y > 0) {
      dailyMap.set(dateKey, point.y * exchangeRate);
    }
  }

  return dailyMap;
}

/**
 * 한 해의 BTC 원화 일별 시세를 조회한다.
 *
 * 커버리지가 모자라면 던진다. 부분적으로 채워진 Map 을 돌려주면
 * "일부 거래만 환산된 중앙값" 이라는 조용히 틀린 값이 만들어진다.
 */
export async function fetchBtcDailyKrwMap(year: number, now = new Date()): Promise<BtcDailyKrwMap> {
  const dailyMap =
    year >= UPBIT_AVAILABLE_FROM_YEAR
      ? await fetchUpbitYearMap(year)
      : await fetchBlockchainYearMap(year);

  const expectedDays = countExpectedDays(year, now);
  const minimumDays = Math.floor(expectedDays * MIN_COVERAGE_RATIO);

  if (dailyMap.size < minimumDays) {
    throw new Error(
      `BTC 시세 커버리지 부족 (${year}): ${dailyMap.size}일 / 최소 ${minimumDays}일 필요`,
    );
  }

  return dailyMap;
}
