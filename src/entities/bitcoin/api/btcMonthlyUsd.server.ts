import { unstable_cache } from "next/cache";
import {
  type BtcMonthlyUsdMap,
  fetchBtcMonthlyUsdMap,
  resolveMonthlyUsdYears,
} from "../lib/btcMonthlyUsd";

/**
 * BTC 달러 월별 종가 ( 서버 캐시 래퍼 ).
 *
 * 수집 로직은 `lib/btcMonthlyUsd` 에 있고 여기서는 캐싱만 얹음.
 *
 * **연도별로 따로 캐시함.** 2010~현재를 한 덩어리로 묶으면 만료될 때마다
 * 업스트림 17회가 통째로 다시 나감. 연도별로 쪼개면 확정된 16개 연도는
 * 30일 동안 안 움직이고 진행 중인 한 해만 다시 받아 재생성당 1회로 떨어짐.
 *
 * `unstable_cache` 는 함수가 던지면 아무것도 보관하지 않음.
 * 커버리지가 모자란 결과가 캐시에 굳지 않도록 하는 장치임.
 */

const DAYS_30_IN_SECONDS = 60 * 60 * 24 * 30;
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
 *
 * 확정된 연도는 30일이라 최솟값 계산에 끼어들지 않음.
 */
function resolveRevalidateSeconds(year: number): number {
  if (year >= new Date().getUTCFullYear()) {
    return HOURS_6_IN_SECONDS;
  }

  return DAYS_30_IN_SECONDS;
}

/**
 * `unstable_cache` 는 `Map` 을 직렬화하지 못하므로 배열로 넘겼다가 되돌림.
 */
function getBtcMonthlyUsdMapByYear(year: number): Promise<[string, number][]> {
  return unstable_cache(
    async () => [...(await fetchBtcMonthlyUsdMap(year)).entries()],
    ["btc-monthly-usd", String(year)],
    { revalidate: resolveRevalidateSeconds(year), tags: ["btc-monthly-usd"] },
  )();
}

/**
 * 2010년부터 지금까지의 월별 종가를 한 Map 으로 합쳐 돌려줌.
 *
 * 병렬로 쏘지 않고 순차로 도는 이유는 콜드 캐시일 때 17개 요청이 한꺼번에
 * blockchain.com 으로 몰리는 것을 피하기 위함임. 캐시가 더워진 뒤에는
 * 대부분 즉시 반환되므로 순차 비용이 사실상 없음.
 */
export async function getBtcMonthlyUsdMap(): Promise<BtcMonthlyUsdMap> {
  const monthlyCloseMap = new Map<string, number>();

  for (const year of resolveMonthlyUsdYears()) {
    for (const [monthKey, price] of await getBtcMonthlyUsdMapByYear(year)) {
      monthlyCloseMap.set(monthKey, price);
    }
  }

  return monthlyCloseMap;
}
