import { unstable_cache } from "next/cache";
import { type BtcDailyKrwMap, fetchBtcDailyKrwMap } from "../lib/btcDailyKrw";

/**
 * 연도별 BTC 원화 일별 시세 ( 서버 캐시 래퍼 ).
 *
 * 수집 로직은 `lib/btcDailyKrw` 에 있고 여기서는 캐싱만 얹는다.
 * 아카이브 생성 스크립트는 Next 밖에서 돌아가므로 `lib` 쪽을 직접 쓴다.
 *
 * `unstable_cache` 는 함수가 던지면 아무것도 보관하지 않는다.
 * 커버리지가 모자란 결과가 캐시에 굳지 않도록 하는 장치다.
 */

const DAYS_30_IN_SECONDS = 60 * 60 * 24 * 30;
const HOURS_6_IN_SECONDS = 60 * 60 * 6;

export type { BtcDailyKrwMap };

/** 진행 중인 연도는 시세가 계속 확정되므로 재검증 주기를 짧게 잡는다. */
function resolveRevalidateSeconds(year: number): number {
  if (year >= new Date().getUTCFullYear()) {
    return HOURS_6_IN_SECONDS;
  }

  return DAYS_30_IN_SECONDS;
}

/**
 * `unstable_cache` 는 `Map` 을 직렬화하지 못하므로 배열로 넘겼다가 되돌린다.
 */
export async function getBtcDailyKrwMap(year: number): Promise<BtcDailyKrwMap> {
  const entries = await unstable_cache(
    async () => [...(await fetchBtcDailyKrwMap(year)).entries()],
    ["btc-daily-krw", String(year)],
    { revalidate: resolveRevalidateSeconds(year), tags: ["btc-daily-krw"] },
  )();

  return new Map(entries);
}
