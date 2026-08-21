import { afterEach, describe, expect, it, vi } from "vitest";
import { FIRST_TRADING_YEAR, fetchBtcMonthlyUsdMap, resolveMonthlyUsdYears } from "./btcMonthlyUsd";

/** 날짜를 그대로 값으로 쓰면 "며칠 값을 집었는지" 를 단언으로 확인할 수 있음. */
function priceOf(dayKey: string): number {
  return Number(dayKey.replaceAll("-", ""));
}

interface ChartOptions {
  /** 값을 0 으로 내려보낼 날짜 ( blockchain.com 초기 구간 재현 ) */
  zeroDays?: Set<string>;
  /** 아예 빠뜨릴 날짜 */
  skipDays?: Set<string>;
  /** 응답을 날짜 내림차순으로 뒤집을지 */
  isDescending?: boolean;
  /** 연말 경계에 다음 해 1월 1일을 덧붙일지 ( 실제 응답이 그럼 ) */
  hasNextYearBoundary?: boolean;
}

/** blockchain.com 차트 응답 흉내. 요청 연도를 하루도 빠짐없이 채움. */
function makeChart(year: number, options: ChartOptions = {}) {
  const {
    zeroDays = new Set<string>(),
    skipDays = new Set<string>(),
    isDescending = false,
    hasNextYearBoundary = true,
  } = options;

  const values = [];
  const endTime = Date.UTC(year + 1, 0, hasNextYearBoundary ? 2 : 1);

  for (let time = Date.UTC(year, 0, 1); time < endTime; time += 86_400_000) {
    const dayKey = new Date(time).toISOString().slice(0, 10);

    if (skipDays.has(dayKey)) {
      continue;
    }

    values.push({ x: time / 1000, y: zeroDays.has(dayKey) ? 0 : priceOf(dayKey) });
  }

  return { values: isDescending ? values.reverse() : values };
}

function mockChart(chart: unknown) {
  const fetchMock = vi.fn(
    async () => ({ ok: true, status: 200, json: async () => chart }) as unknown as Response,
  );

  vi.stubGlobal("fetch", fetchMock);

  return fetchMock;
}

/** 'YYYY-MM-DD' 연속 구간을 Set 으로 만듦. */
function makeDayRange(fromDay: string, toDay: string): Set<string> {
  const days = new Set<string>();
  const end = new Date(`${toDay}T00:00:00Z`).getTime();

  for (let time = new Date(`${fromDay}T00:00:00Z`).getTime(); time <= end; time += 86_400_000) {
    days.add(new Date(time).toISOString().slice(0, 10));
  }

  return days;
}

const SETTLED_NOW = new Date("2026-08-21T00:00:00Z");

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("resolveMonthlyUsdYears", () => {
  it("2010년부터 진행 중인 해까지 이어 붙인다", () => {
    const years = resolveMonthlyUsdYears(SETTLED_NOW);

    expect(years[0]).toBe(FIRST_TRADING_YEAR);
    expect(years.at(-1)).toBe(2026);
    expect(years).toHaveLength(2026 - FIRST_TRADING_YEAR + 1);
  });
});

describe("fetchBtcMonthlyUsdMap", () => {
  it("한 해를 열두 달로 채운다", async () => {
    mockChart(makeChart(2023));

    const map = await fetchBtcMonthlyUsdMap(2023, SETTLED_NOW);

    expect(map.size).toBe(12);
  });

  it("각 달의 마지막 거래일 값을 종가로 쓴다", async () => {
    mockChart(makeChart(2023));

    const map = await fetchBtcMonthlyUsdMap(2023, SETTLED_NOW);

    expect(map.get("2023-01")).toBe(priceOf("2023-01-31"));
    expect(map.get("2023-02")).toBe(priceOf("2023-02-28"));
    expect(map.get("2023-12")).toBe(priceOf("2023-12-31"));
  });

  it("응답이 날짜 내림차순으로 와도 마지막 거래일을 고른다", async () => {
    mockChart(makeChart(2023, { isDescending: true }));

    const map = await fetchBtcMonthlyUsdMap(2023, SETTLED_NOW);

    expect(map.get("2023-01")).toBe(priceOf("2023-01-31"));
    expect(map.get("2023-12")).toBe(priceOf("2023-12-31"));
  });

  it("월 마지막 날이 비면 그 앞의 거래일을 종가로 쓴다", async () => {
    mockChart(makeChart(2023, { skipDays: makeDayRange("2023-03-30", "2023-03-31") }));

    const map = await fetchBtcMonthlyUsdMap(2023, SETTLED_NOW);

    expect(map.get("2023-03")).toBe(priceOf("2023-03-29"));
  });

  it("응답에 섞인 다음 해 1월 1일을 그 해에 담지 않는다", async () => {
    mockChart(makeChart(2023));

    const map = await fetchBtcMonthlyUsdMap(2023, SETTLED_NOW);

    expect(map.has("2024-01")).toBe(false);
  });

  /**
   * 이 테스트가 잡는 버그:
   * blockchain.com 은 2010-08-17 까지 값을 `0` 으로 내려줌. 안 거르면 2010-08 종가가
   * 0 이 되고, 그 달을 분모로 쓰는 2010-09 등락률이 `Infinity` 가 됨.
   */
  it("값이 0 인 날은 종가 후보에서 뺀다", async () => {
    mockChart(
      makeChart(2010, {
        zeroDays: makeDayRange("2010-01-01", "2010-08-17"),
      }),
    );

    const map = await fetchBtcMonthlyUsdMap(2010, SETTLED_NOW);

    expect(map.has("2010-07")).toBe(false);
    expect(map.get("2010-08")).toBe(priceOf("2010-08-31"));
    expect(map.size).toBe(5);
  });

  it("진행 중인 연도는 이번 달까지만 있어도 통과한다", async () => {
    mockChart(makeChart(2026, { skipDays: makeDayRange("2026-08-22", "2026-12-31") }));

    const map = await fetchBtcMonthlyUsdMap(2026, SETTLED_NOW);

    expect(map.size).toBe(8);
    expect(map.get("2026-08")).toBe(priceOf("2026-08-21"));
  });

  it("확정된 연도에 달이 비면 던진다", async () => {
    mockChart(makeChart(2023, { skipDays: makeDayRange("2023-06-01", "2023-06-30") }));

    await expect(fetchBtcMonthlyUsdMap(2023, SETTLED_NOW)).rejects.toThrow("커버리지 부족");
  });

  /** `timespan=all` 은 4일 간격이라 월 마지막 거래일을 못 집음. 요청 형태를 고정함. */
  it("연 단위 일별 응답을 요청한다", async () => {
    const fetchMock = mockChart(makeChart(2023));

    await fetchBtcMonthlyUsdMap(2023, SETTLED_NOW);

    const [requestUrl] = fetchMock.mock.calls[0] as unknown as [string];

    expect(requestUrl).toContain("timespan=1year");
    expect(requestUrl).toContain("start=2023-01-01");
  });

  it("시세가 없는 연도는 던진다", async () => {
    mockChart(makeChart(2009));

    await expect(fetchBtcMonthlyUsdMap(2009, SETTLED_NOW)).rejects.toThrow("없는 연도");
  });

  it("응답 형식이 어긋나면 던진다", async () => {
    mockChart({ values: null });

    await expect(fetchBtcMonthlyUsdMap(2023, SETTLED_NOW)).rejects.toThrow("응답 형식 오류");
  });

  it("계속 실패하면 재시도한 뒤 던진다", async () => {
    const fetchMock = vi.fn(
      async () => ({ ok: false, status: 429, json: async () => ({}) }) as unknown as Response,
    );

    vi.stubGlobal("fetch", fetchMock);

    await expect(fetchBtcMonthlyUsdMap(2023, SETTLED_NOW)).rejects.toThrow("조회 실패");
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });
});
