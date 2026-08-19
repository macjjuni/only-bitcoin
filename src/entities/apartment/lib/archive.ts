import archiveJson from "../model/archive.json";
import type { ApartmentYearPoint } from "./buildApartmentSeries";

/**
 * `scripts/build-apartment-archive.ts` 가 생성한 확정 연도 집계.
 *
 * 확정된 과거 연도는 실거래도 BTC 시세도 변하지 않으므로 값이 고정이다.
 * 이 아카이브 덕분에 런타임은 그 이후 구간만 조회하면 된다 ( 구당 152회 → 8회 ).
 *
 * 갱신을 잊어도 앱은 정상 동작한다. `resolveRuntimeStartYear` 가 아카이브의
 * 마지막 연도 다음부터 조회하도록 잡으므로, 빈 구간은 실시간으로 메꿔지고
 * 호출량만 늘어난다.
 */
interface ApartmentArchive {
  generatedAt: string;
  settledThroughYear: number;
  apartments: Record<string, ApartmentYearPoint[]>;
}

const archive = archiveJson as ApartmentArchive;

/** 이 단지의 아카이브된 연도 집계. 없으면 빈 배열. */
export function getArchivedYearPoints(apartmentID: string): ApartmentYearPoint[] {
  return archive.apartments[apartmentID] ?? [];
}

/**
 * 런타임으로 조회를 시작할 연도.
 *
 * 아카이브의 **마지막 연도 + 1** 부터다. 아카이브가 낡아도 그만큼 실시간 조회가
 * 늘어날 뿐 데이터가 비지 않는다. 아카이브가 아예 없는 단지는 `fallbackStartYear` 부터.
 */
export function resolveRuntimeStartYear(apartmentID: string, fallbackStartYear: number): number {
  const archivedYearPoints = getArchivedYearPoints(apartmentID);

  if (archivedYearPoints.length === 0) {
    return fallbackStartYear;
  }

  const lastArchivedYear = archivedYearPoints.reduce(
    (latest, yearPoint) => Math.max(latest, yearPoint.year),
    0,
  );

  return Math.max(fallbackStartYear, lastArchivedYear + 1);
}

/** 아카이브 생성 일자 ( 디버깅·표시용 ) */
export const ARCHIVE_GENERATED_AT = archive.generatedAt;
