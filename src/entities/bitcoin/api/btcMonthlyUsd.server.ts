import { unstable_cache } from "next/cache";
import {
  type BtcMonthlyUsdMap,
  fetchBtcMonthlyUsdMap,
  resolveMonthlyUsdYears,
} from "../lib/btcMonthlyUsd";
import { getArchivedMonthlyUsdMap, resolveRuntimeStartYear } from "../lib/btcMonthlyUsdArchive";

/**
 * BTC 달러 월별 종가 ( 서버 캐시 래퍼 ).
 *
 * 확정 연도는 `btcMonthlyUsdArchive.json` 에서 읽고, 진행 중인 연도만 API 로 조회한다.
 * 아카이브 덕분에 재생성당 API 호출이 17회에서 1회로 줄어든다.
 *
 * 아카이브가 낡아도 앱은 정상 동작한다. `resolveRuntimeStartYear` 이후 연도를
 * API 로 메꾸므로 호출량만 늘어날 뿐 데이터가 비지 않는다.
 */

const HOURS_6_IN_SECONDS = 60 * 60 * 6;

export type { BtcMonthlyUsdMap };

/**
 * 진행 중인 연도는 마지막 달 종가가 계속 갱신되므로 재검증 주기를 짧게 잡음.
 *
 * **이 값이 `/cagr` 페이지의 실제 재생성 주기를 정함.** Next 는 라우트의 revalidate 를
 * `page.tsx` 의 값과 그 안에서 쓰인 캐시들의 TTL 중 **최솟값**으로 잡음. 여기를
 * 1시간으로 두면 `page.tsx` 에 6시간을 적어도 빌드 결과가 1시간으로 내려앉음
 * ( `next build` 의 Revalidate 열에서 확인됨 ). 그래서 둘을 같은 값으로 맞춰 둠.
 * 한쪽만 바꾸면 조용히 다른 쪽이 무시되므로 항상 같이 바꿔야 함.
 */

/**
 * `unstable_cache` 는 `Map` 을 직렬화하지 못하므로 배열로 넘겼다가 되돌림.
 */
function getBtcMonthlyUsdMapByYear(year: number): Promise<[string, number][]> {
  return unstable_cache(
    async () => [...(await fetchBtcMonthlyUsdMap(year)).entries()],
    ["btc-monthly-usd", String(year)],
    { revalidate: HOURS_6_IN_SECONDS, tags: ["btc-monthly-usd"] },
  )();
}

/**
 * 2010년부터 지금까지의 월별 종가를 한 Map 으로 합쳐 돌려줌.
 *
 * 확정 연도는 아카이브에서 즉시 읽고, 아카이브 이후 연도만 API 로 조회한다.
 */
export async function getBtcMonthlyUsdMap(): Promise<BtcMonthlyUsdMap> {
  const monthlyCloseMap = new Map<string, number>(getArchivedMonthlyUsdMap());

  const runtimeStartYear = resolveRuntimeStartYear();
  const runtimeYears = resolveMonthlyUsdYears().filter((year) => year >= runtimeStartYear);

  for (const year of runtimeYears) {
    for (const [monthKey, price] of await getBtcMonthlyUsdMapByYear(year)) {
      monthlyCloseMap.set(monthKey, price);
    }
  }

  return monthlyCloseMap;
}
