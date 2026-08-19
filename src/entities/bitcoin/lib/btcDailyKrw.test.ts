import { afterEach, describe, expect, it, vi } from "vitest";
import { fetchBtcDailyKrwMap } from "./btcDailyKrw";

const BITHUMB_PRICE = 100_000_000;
const BLOCKCHAIN_USD = 1_000;

/** 빗썸 일봉 응답 흉내. `to` 는 배타적이라 그 전날부터 과거로 `count` 개를 돌려준다. */
function makeBithumbCandles(toValue: string, count: number, skipDates: Set<string> = new Set()) {
  const to = new Date(`${toValue.replace(" ", "T")}Z`);

  return Array.from({ length: count }, (_, index) => {
    const date = new Date(to);
    date.setUTCDate(date.getUTCDate() - index - 1);

    return date.toISOString().slice(0, 10);
  })
    .filter((dateKey) => !skipDates.has(dateKey))
    .map((dateKey) => ({
      candle_date_time_kst: `${dateKey}T00:00:00`,
      trade_price: BITHUMB_PRICE,
    }));
}

/** blockchain.com 차트 응답 흉내. 요청 연도를 하루도 빠짐없이 채운다. */
function makeBlockchainChart(year: number) {
  const values = [];

  for (let time = Date.UTC(year, 0, 1); time < Date.UTC(year + 1, 0, 1); time += 86_400_000) {
    values.push({ x: time / 1000, y: BLOCKCHAIN_USD });
  }

  return { values };
}

interface MockOptions {
  /** 빗썸이 한 요청에 돌려줄 개수 */
  countPerRequest?: number;
  /** 실패시킬 빗썸 요청 순번 */
  failRequestIndexes?: number[];
  /** 빗썸에서 빠뜨릴 날짜 ( 거래소 중단 구간 재현 ) */
  bithumbGap?: Set<string>;
}

function mockSources({
  countPerRequest = 200,
  failRequestIndexes = [],
  bithumbGap = new Set<string>(),
}: MockOptions = {}) {
  let bithumbRequestIndex = -1;
  const calls = { bithumb: 0, blockchain: 0 };

  const fetchMock = vi.fn(async (url: string) => {
    if (url.includes("blockchain.info")) {
      calls.blockchain += 1;
      const year = Number(new URL(url).searchParams.get("start")?.slice(0, 4));

      return {
        ok: true,
        status: 200,
        json: async () => makeBlockchainChart(year),
      } as unknown as Response;
    }

    calls.bithumb += 1;
    bithumbRequestIndex += 1;

    if (failRequestIndexes.includes(bithumbRequestIndex)) {
      return { ok: false, status: 429, json: async () => ({}) } as unknown as Response;
    }

    const to = new URL(url).searchParams.get("to") ?? "";

    return {
      ok: true,
      status: 200,
      json: async () => makeBithumbCandles(to, countPerRequest, bithumbGap),
    } as unknown as Response;
  });

  return { fetchMock, calls };
}

/** 'YYYY-MM-DD' 연속 구간을 Set 으로 만든다. */
function makeDateRange(fromDate: string, toDate: string): Set<string> {
  const dates = new Set<string>();
  const end = new Date(`${toDate}T00:00:00Z`).getTime();

  for (let time = new Date(`${fromDate}T00:00:00Z`).getTime(); time <= end; time += 86_400_000) {
    dates.add(new Date(time).toISOString().slice(0, 10));
  }

  return dates;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("fetchBtcDailyKrwMap", () => {
  it("한 해를 일별로 채운다", async () => {
    const { fetchMock } = mockSources();
    vi.stubGlobal("fetch", fetchMock);

    const map = await fetchBtcDailyKrwMap(2023, new Date("2026-08-18T00:00:00Z"));

    expect(map.size).toBe(365);
    expect(map.get("2023-01-01")).toBe(BITHUMB_PRICE);
    expect(map.get("2023-12-31")).toBe(BITHUMB_PRICE);
  });

  /**
   * 업비트가 아니라 빗썸을 쓰는 이유가 KST 자정 마감이므로,
   * 소스가 바뀌었다는 사실 자체를 고정한다.
   */
  it("빗썸 일봉을 소스로 쓴다", async () => {
    const { fetchMock } = mockSources();
    vi.stubGlobal("fetch", fetchMock);

    await fetchBtcDailyKrwMap(2023, new Date("2026-08-18T00:00:00Z"));

    for (const [url] of fetchMock.mock.calls) {
      expect(url).toContain("api.bithumb.com");
    }
  });

  it("빗썸이 한 해를 다 덮으면 blockchain.com 을 부르지 않는다", async () => {
    const { fetchMock, calls } = mockSources();
    vi.stubGlobal("fetch", fetchMock);

    await fetchBtcDailyKrwMap(2023, new Date("2026-08-18T00:00:00Z"));

    expect(calls.blockchain).toBe(0);
  });

  /**
   * 이 테스트가 잡는 버그:
   * 빗썸에는 2014-05-17~07-01( 46일 ), 2015-07-01~08-14( 45일 ) 연속 결측이 있다.
   * 10일 소급으로 못 메우는 구간이라, 폴백이 없으면 강남구 기준 그 해 거래의
   * 약 8% 가 BTC 환산에서 통째로 탈락한다.
   */
  it("빗썸 결측 구간을 blockchain.com 으로 메운다", async () => {
    const gap = makeDateRange("2014-05-17", "2014-07-01");
    const { fetchMock, calls } = mockSources({ bithumbGap: gap });
    vi.stubGlobal("fetch", fetchMock);

    const map = await fetchBtcDailyKrwMap(2014, new Date("2026-08-18T00:00:00Z"));

    expect(map.size).toBe(365);
    expect(calls.blockchain).toBe(1);
    // 결측일은 환율 환산값( 1,000 USD × 1,053 )으로 채워진다.
    expect(map.get("2014-06-01")).toBe(BLOCKCHAIN_USD * 1053);
  });

  it("폴백은 빗썸이 채운 날짜를 덮어쓰지 않는다", async () => {
    const gap = makeDateRange("2014-05-17", "2014-07-01");
    const { fetchMock } = mockSources({ bithumbGap: gap });
    vi.stubGlobal("fetch", fetchMock);

    const map = await fetchBtcDailyKrwMap(2014, new Date("2026-08-18T00:00:00Z"));

    // 결측 구간 밖은 국내 실제 체결가가 남아 있어야 한다.
    expect(map.get("2014-03-01")).toBe(BITHUMB_PRICE);
    expect(map.get("2014-12-31")).toBe(BITHUMB_PRICE);
  });

  /**
   * 이 테스트가 잡는 버그:
   * 초기 구현은 실패한 요청을 `continue` 로 넘겨 **절반만 채워진 Map** 을 돌려줬다.
   * 그 결과 아카이브 622개 버킷 중 290개가 "일부 거래만 환산된 중앙값" 이 됐다.
   */
  it("일부 요청이 실패하면 빈 Map 을 돌려주지 않고 던진다", async () => {
    // 재시도까지 모두 실패시킨다 ( 첫 구간 3회 시도 )
    const { fetchMock } = mockSources({ failRequestIndexes: [0, 1, 2] });
    vi.stubGlobal("fetch", fetchMock);

    await expect(fetchBtcDailyKrwMap(2023, new Date("2026-08-18T00:00:00Z"))).rejects.toThrow(
      /BTC 시세 조회 실패/,
    );
  });

  it("폴백으로도 못 채우면 던진다", async () => {
    // 요청당 30일치만 돌아오고, 폴백 연도도 아니라 메울 방법이 없다
    const { fetchMock } = mockSources({ countPerRequest: 30 });
    vi.stubGlobal("fetch", fetchMock);

    await expect(fetchBtcDailyKrwMap(2023, new Date("2026-08-18T00:00:00Z"))).rejects.toThrow(
      /연평균 환율이 없는 연도/,
    );
  });

  it("재시도로 회복되면 정상 결과를 돌려준다", async () => {
    // 첫 시도만 실패하고 두 번째에 성공
    const { fetchMock } = mockSources({ failRequestIndexes: [0] });
    vi.stubGlobal("fetch", fetchMock);

    const map = await fetchBtcDailyKrwMap(2023, new Date("2026-08-18T00:00:00Z"));

    expect(map.size).toBe(365);
  });

  it("진행 중인 연도는 오늘까지만 채워져도 통과한다", async () => {
    const { fetchMock } = mockSources();
    vi.stubGlobal("fetch", fetchMock);

    const map = await fetchBtcDailyKrwMap(2026, new Date("2026-08-18T00:00:00Z"));

    // 1월 1일 ~ 8월 17일 = 229일. 연말까지 요구하면 실패했을 것이다.
    expect(map.size).toBeGreaterThan(200);
  });

  it("빗썸 상장 이전 연도는 조회하지 않고 던진다", async () => {
    const { fetchMock, calls } = mockSources();
    vi.stubGlobal("fetch", fetchMock);

    await expect(fetchBtcDailyKrwMap(2010, new Date("2026-08-18T00:00:00Z"))).rejects.toThrow(
      /BTC 원화 시세가 없는 연도/,
    );
    expect(calls.bithumb).toBe(0);
  });
});
