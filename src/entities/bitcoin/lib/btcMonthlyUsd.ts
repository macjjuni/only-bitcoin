/**
 * 연도별 BTC 달러 월별 종가 조회 ( Next 비의존 순수 모듈 ).
 *
 * 월별 등락률 히트맵은 2010년 행부터 그려야 해서 국내 시세를 못 씀.
 * 빗썸 일봉은 2013-12-27 부터라 2010~2013 네 개 행이 통째로 비고,
 * 그 시기 등락률( 2013년 한 해 +5000% 대 )이 이 히트맵의 핵심이라 빠지면 의미가 없음.
 * 그래서 이 모듈만 blockchain.com 달러 시세를 씀.
 *
 * **`timespan=all` 을 쓰면 안 됨.** 4일 간격으로 솎아서 내려오기 때문에
 * ( 17년치가 1,609건 ) 월 마지막 거래일을 못 집음. 반드시 `timespan=1year&start=`
 * 로 연 단위 요청해야 366건 일별로 옴.
 *
 * **`y > 0` 필터가 필수임.** 2010-08-17 까지는 값이 `0` 으로 내려옴
 * ( 첫 유효값은 2010-08-18 의 0.07 ). 안 거르면 2010-08 종가가 0 이 되고
 * 2010-09 등락률이 `Infinity` 가 됨.
 *
 * **커버리지가 모자라면 던짐.** 부분적으로 채워진 Map 을 돌려주면 빈 달이
 * 그냥 빈 칸으로 끝나지 않음. 다음 달 셀이 "전월 대비" 를 계산할 분모를 잃고,
 * 1월 셀은 전년 12월을 분모로 쓰므로 한 해 경계까지 조용히 틀어짐.
 */

const BLOCKCHAIN_MARKET_PRICE_URL = "https://api.blockchain.info/charts/market-price";

/** blockchain.com 시세가 0 을 벗어나는 첫 달. 이 이전은 어떤 소스로도 못 채움. */
export const FIRST_TRADING_YEAR = 2010;
const FIRST_TRADING_MONTH = 8;

const MAX_FETCH_ATTEMPTS = 3;
const RETRY_BASE_DELAY_MS = 500;

/** 'YYYY-MM' → 그 달의 BTC 달러 종가 */
export type BtcMonthlyUsdMap = ReadonlyMap<string, number>;

interface BlockchainChartPoint {
  x: number;
  y: number;
}

interface BlockchainChartResponse {
  values: BlockchainChartPoint[];
}

const delay = (milliseconds: number) => new Promise((resolve) => setTimeout(resolve, milliseconds));

/** 히트맵이 덮어야 할 연도 목록. 2010년부터 진행 중인 해까지. */
export function resolveMonthlyUsdYears(now = new Date()): number[] {
  const currentYear = now.getUTCFullYear();
  const years: number[] = [];

  for (let year = FIRST_TRADING_YEAR; year <= currentYear; year += 1) {
    years.push(year);
  }

  return years;
}

/**
 * 그 해에 값이 있어야 할 달 수.
 *
 * 첫 해는 8월부터, 진행 중인 해는 이번 달까지만 셈.
 * 이번 달은 아직 안 끝났어도 그날까지의 마지막 값이 있으므로 세는 게 맞음.
 */
function countExpectedMonths(year: number, now: Date): number {
  const firstMonth = year === FIRST_TRADING_YEAR ? FIRST_TRADING_MONTH : 1;
  const lastMonth = year === now.getUTCFullYear() ? now.getUTCMonth() + 1 : 12;

  return Math.max(0, lastMonth - firstMonth + 1);
}

/** 재시도하며 JSON 을 받아 옴. 끝내 실패하면 던짐. */
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

  throw new Error(`BTC 달러 시세 조회 실패 (${label}): ${lastErrorMessage}`);
}

/**
 * 한 해의 월별 종가를 조회함.
 *
 * 응답이 날짜 오름차순이라고 가정하지 않고 **각 달에서 가장 늦은 날짜** 를 골라 둠.
 * 정렬이 어긋난 응답 하나가 종가를 월초 값으로 바꿔 놓는 사고를 막음.
 */
export async function fetchBtcMonthlyUsdMap(
  year: number,
  now = new Date(),
): Promise<BtcMonthlyUsdMap> {
  if (year < FIRST_TRADING_YEAR) {
    throw new Error(
      `BTC 달러 시세가 없는 연도입니다 (${year}): 유효한 첫 달은 ${FIRST_TRADING_YEAR}-0${FIRST_TRADING_MONTH}`,
    );
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
    throw new Error(`BTC 달러 시세 응답 형식 오류 (blockchain.com ${year}): 배열이 아님`);
  }

  /** 'YYYY-MM' → 그 달에서 지금까지 본 가장 늦은 날짜와 그 값 */
  const latestByMonth = new Map<string, { dayKey: string; price: number }>();

  for (const point of chart.values) {
    const dayKey = new Date(point.x * 1000).toISOString().slice(0, 10);

    if (!dayKey.startsWith(String(year)) || !(point.y > 0)) {
      continue;
    }

    const monthKey = dayKey.slice(0, 7);
    const latest = latestByMonth.get(monthKey);

    if (!latest || dayKey > latest.dayKey) {
      latestByMonth.set(monthKey, { dayKey, price: point.y });
    }
  }

  const expectedMonths = countExpectedMonths(year, now);

  if (latestByMonth.size < expectedMonths) {
    throw new Error(
      `BTC 달러 시세 커버리지 부족 (${year}): ${latestByMonth.size}개월 / 최소 ${expectedMonths}개월 필요`,
    );
  }

  return new Map([...latestByMonth].map(([monthKey, { price }]) => [monthKey, price]));
}
