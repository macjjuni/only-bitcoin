import { afterEach, describe, expect, it, vi } from "vitest";
import { fetchBtcDailyKrwMap } from "./btcDailyKrw";

/** Upbit 일봉 응답 흉내. `to` 기준 과거로 `count` 개를 돌려준다. */
function makeUpbitCandles(toIso: string, count: number) {
  const to = new Date(toIso);

  return Array.from({ length: count }, (_, index) => {
    const date = new Date(to);
    date.setUTCDate(date.getUTCDate() - index - 1);

    return {
      candle_date_time_kst: `${date.toISOString().slice(0, 10)}T00:00:00`,
      trade_price: 100_000_000,
    };
  });
}

function mockUpbit(countPerRequest = 200, failRequestIndexes: number[] = []) {
  let requestIndex = -1;

  return vi.fn(async (url: string) => {
    requestIndex += 1;

    if (failRequestIndexes.includes(requestIndex)) {
      return { ok: false, status: 429, json: async () => ({}) } as unknown as Response;
    }

    const to = new URL(url).searchParams.get("to") ?? "";

    return {
      ok: true,
      status: 200,
      json: async () => makeUpbitCandles(to, countPerRequest),
    } as unknown as Response;
  });
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("fetchBtcDailyKrwMap", () => {
  it("한 해를 일별로 채운다", async () => {
    vi.stubGlobal("fetch", mockUpbit());

    const map = await fetchBtcDailyKrwMap(2023, new Date("2026-08-18T00:00:00Z"));

    expect(map.size).toBe(365);
    expect(map.get("2023-01-01")).toBe(100_000_000);
    expect(map.get("2023-12-31")).toBe(100_000_000);
  });

  /**
   * 이 테스트가 잡는 버그:
   * 초기 구현은 실패한 요청을 `continue` 로 넘겨 **절반만 채워진 Map** 을 돌려줬다.
   * 그 결과 아카이브 622개 버킷 중 290개가 "일부 거래만 환산된 중앙값" 이 됐다.
   */
  it("일부 요청이 실패하면 빈 Map 을 돌려주지 않고 던진다", async () => {
    // 재시도까지 모두 실패시킨다 ( 첫 구간 3회 시도 )
    vi.stubGlobal("fetch", mockUpbit(200, [0, 1, 2]));

    await expect(fetchBtcDailyKrwMap(2023, new Date("2026-08-18T00:00:00Z"))).rejects.toThrow(
      /BTC 시세 조회 실패/,
    );
  });

  it("응답이 와도 커버리지가 모자라면 던진다", async () => {
    // 요청당 30일치만 돌아와 한 해를 못 채우는 상황
    vi.stubGlobal("fetch", mockUpbit(30));

    await expect(fetchBtcDailyKrwMap(2023, new Date("2026-08-18T00:00:00Z"))).rejects.toThrow(
      /커버리지 부족/,
    );
  });

  it("재시도로 회복되면 정상 결과를 돌려준다", async () => {
    // 첫 시도만 실패하고 두 번째에 성공
    vi.stubGlobal("fetch", mockUpbit(200, [0]));

    const map = await fetchBtcDailyKrwMap(2023, new Date("2026-08-18T00:00:00Z"));

    expect(map.size).toBe(365);
  });

  it("진행 중인 연도는 오늘까지만 채워져도 통과한다", async () => {
    vi.stubGlobal("fetch", mockUpbit());

    const map = await fetchBtcDailyKrwMap(2026, new Date("2026-08-18T00:00:00Z"));

    // 1월 1일 ~ 8월 17일 = 229일. 연말까지 요구하면 실패했을 것이다.
    expect(map.size).toBeGreaterThan(200);
  });

  it("연평균 환율이 없는 옛 연도는 던진다", async () => {
    vi.stubGlobal("fetch", mockUpbit());

    await expect(fetchBtcDailyKrwMap(2010, new Date("2026-08-18T00:00:00Z"))).rejects.toThrow(
      /연평균 환율이 없는 연도/,
    );
  });
});
