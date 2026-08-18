/**
 * 연도별 BTC 원화 일별 시세 조회 (서버 전용).
 *
 * 아파트 실거래를 **거래일 시세**로 환산하려면 일별 해상도가 필요하다.
 * 연평균·연말종가 같은 연도 대표값으로 나누면 은마 2021 기준 -15%, 2018 기준 +95% 어긋난다.
 *
 * 소스가 구간별로 갈린다.
 * - 2018 이후: Upbit KRW-BTC 일봉 (원화 직접)
 * - 2017 이전: blockchain.com USD 일별 × 연평균 환율
 *
 * Upbit 은 2017-10 이전 데이터가 없어( 실제 조회로 확인 ) 그 이전 구간을 채울 수 없다.
 * 2017년은 경계에 걸쳐 있어 소스를 섞지 않고 blockchain.com 으로 통일한다.
 */

const UPBIT_CANDLE_URL = "https://api.upbit.com/v1/candles/days";
const BLOCKCHAIN_MARKET_PRICE_URL = "https://api.blockchain.info/charts/market-price";

/** Upbit 일봉이 신뢰할 만하게 존재하는 첫 연도 */
const UPBIT_AVAILABLE_FROM_YEAR = 2018;

/** Upbit 일봉 한 번에 가져올 수 있는 최대 개수 */
const UPBIT_MAX_COUNT = 200;

const DAYS_30_IN_SECONDS = 60 * 60 * 24 * 30;
const HOURS_6_IN_SECONDS = 60 * 60 * 6;

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

/** 진행 중인 연도는 시세가 계속 확정되므로 재검증 주기를 짧게 잡는다. */
function resolveRevalidateSeconds(year: number): number {
  const currentYear = new Date().getUTCFullYear();

  if (year >= currentYear) {
    return HOURS_6_IN_SECONDS;
  }

  return DAYS_30_IN_SECONDS;
}

/**
 * Upbit 일봉으로 한 해를 채운다.
 *
 * `count` 상한이 200이라 한 해를 두 번에 나눠 받는다.
 * `to` 는 배타적 상한이므로 다음 구간 시작일을 넘긴다.
 */
async function fetchUpbitYearMap(year: number): Promise<Map<string, number>> {
  const dailyMap = new Map<string, number>();
  const revalidate = resolveRevalidateSeconds(year);

  const requestRanges = [`${year}-07-02T00:00:00Z`, `${year + 1}-01-01T00:00:00Z`];

  for (const to of requestRanges) {
    const url = `${UPBIT_CANDLE_URL}?market=KRW-BTC&count=${UPBIT_MAX_COUNT}&to=${to}`;
    const response = await fetch(url, { next: { revalidate } });

    if (!response.ok) {
      continue;
    }

    const candles = (await response.json()) as UpbitDailyCandle[];

    if (!Array.isArray(candles)) {
      continue;
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
    return dailyMap;
  }

  const searchParams = new URLSearchParams({
    timespan: "1year",
    start: `${year}-01-01`,
    format: "json",
    cors: "true",
  });

  const response = await fetch(`${BLOCKCHAIN_MARKET_PRICE_URL}?${searchParams.toString()}`, {
    next: { revalidate: resolveRevalidateSeconds(year) },
  });

  if (!response.ok) {
    return dailyMap;
  }

  const chart = (await response.json()) as BlockchainChartResponse;

  if (!Array.isArray(chart?.values)) {
    return dailyMap;
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
 * 실패해도 던지지 않고 빈 Map 을 돌려준다. 호출부는 BTC 환산만 건너뛰고
 * KRW 집계는 그대로 내보내므로, 시세 소스 장애가 페이지 전체를 죽이지 않는다.
 */
export async function getBtcDailyKrwMap(year: number): Promise<BtcDailyKrwMap> {
  try {
    if (year >= UPBIT_AVAILABLE_FROM_YEAR) {
      return await fetchUpbitYearMap(year);
    }

    return await fetchBlockchainYearMap(year);
  } catch (error) {
    console.warn(`BTC 일별 시세 조회 실패 (${year})`, error);
    return new Map();
  }
}
