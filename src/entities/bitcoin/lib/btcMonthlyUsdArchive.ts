import archiveJson from "../model/btcMonthlyUsdArchive.json";

/**
 * `scripts/build-btc-monthly-usd-archive.ts` 가 생성한 확정 연도 월별 종가.
 *
 * 확정된 과거 연도는 시세가 변하지 않으므로 값이 고정이다.
 * 이 아카이브 덕분에 런타임은 그 이후 구간만 조회하면 된다. ( 재생성당 17회 → 1회 )
 *
 * 갱신을 잊어도 앱은 정상 동작한다. `resolveRuntimeStartYear` 가 아카이브의
 * 마지막 연도 다음부터 조회하도록 잡으므로, 빈 구간은 실시간으로 메꿔지고
 * 호출량만 늘어난다.
 */
interface BtcMonthlyUsdArchive {
  generatedAt: string;
  settledThroughYear: number;
  monthlyUsdClose: Record<string, number>;
}

const archive = archiveJson as BtcMonthlyUsdArchive;

/** 아카이브에 담긴 월별 종가 Map. 'YYYY-MM' → USD 종가. */
export function getArchivedMonthlyUsdMap(): ReadonlyMap<string, number> {
  return new Map(Object.entries(archive.monthlyUsdClose));
}

/**
 * 런타임으로 조회를 시작할 연도.
 *
 * 아카이브의 **마지막 연도 + 1** 부터다. 아카이브가 낡아도 그만큼 실시간 조회가
 * 늘어날 뿐 데이터가 비지 않는다.
 */
export function resolveRuntimeStartYear(): number {
  return archive.settledThroughYear + 1;
}
