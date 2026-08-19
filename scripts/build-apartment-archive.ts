/**
 * 아파트 실거래 아카이브 생성 스크립트.
 *
 * 확정된 과거 연도는 값이 변하지 않으므로 매번 공공 API 를 훑을 이유가 없다.
 * 이 스크립트가 한 번 수집해 `archive.json` 으로 떨궈 두면, 런타임에는
 * 아카이브 이후 구간만 조회하면 된다. ( 구당 152회 → 8회 )
 *
 * 앱 런타임이 아니라 **개발자가 수동으로** 돌린다.
 *   pnpm build:apartment-archive            항상 재생성
 *   pnpm build:apartment-archive --if-stale 낡았을 때만 재생성 ( pnpm dev 가 부른다 )
 *
 * 다시 돌려야 할 때
 * - 해가 바뀌고 2월이 지난 뒤 ( 직전 연도 신고 지연분 마감 )  -> --if-stale 이 감지한다
 * - 랜드마크를 추가했을 때                                  -> --if-stale 이 감지한다
 * - 집계 로직을 바꿨을 때                                   -> 감지 못 한다. 직접 돌려야 한다
 *
 * `--if-stale` 은 실패해도 종료 코드 0 이다. 개발 서버 기동을 막지 않기 위해서다.
 * 아카이브가 낡아도 런타임이 빈 구간을 실시간으로 메우므로 앱은 정상 동작한다.
 *
 * 돌리는 것을 잊어도 앱은 정상 동작한다. 라우트가 아카이브 마지막 연도 다음부터
 * 현재까지를 실시간으로 메꾸므로, 호출량만 늘어날 뿐이다.
 *
 * 앱과 **같은 집계 모듈을 그대로 import** 한다. 로직을 복제하지 않으므로
 * 아카이브와 런타임 결과가 어긋날 여지가 없다.
 */

import { readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  type ApartmentYearPoint,
  buildYearPoints,
} from "../src/entities/apartment/lib/buildApartmentSeries";
import {
  countItemElements,
  isSuccessfulAptTradeResponse,
  parseAptTradeXml,
  readTotalCount,
} from "../src/entities/apartment/lib/parseAptTradeXml";
import { buildAptTradeUrl } from "../src/entities/apartment/lib/serviceKey";
import { landmarkApartmentList } from "../src/entities/apartment/model/landmarks";
import type { ApartmentTrade } from "../src/entities/apartment/model/types";
import { CHART_START_YEAR } from "../src/entities/apartment/model/types";
import { type BtcDailyKrwMap, fetchBtcDailyKrwMap } from "../src/entities/bitcoin/lib/btcDailyKrw";

const SERVICE_KEY = process.env.DATA_GO_KR_SERVICE_KEY ?? "";

/** 라우트와 동일한 발사 간격. 152개월 실측에서 초당 제한 0건이었던 값. */
const MIN_REQUEST_INTERVAL_MS = 40;

const MAX_FETCH_ATTEMPTS = 3;
const RETRY_BASE_DELAY_MS = 400;

/**
 * 직전 연도를 아카이브에 담아도 되는 최소 월.
 *
 * 부동산 거래는 계약 후 30일 이내 신고라, 12월 계약이 다음 해 1월 말까지 들어온다.
 * 1~2월에 스크립트를 돌리면 직전 연도가 아직 확정되지 않았으므로 한 해 더 물러선다.
 */
const SETTLED_PREVIOUS_YEAR_FROM_MONTH = 3;

/** 낡았을 때만 생성하는 모드. `pnpm dev` 가 이 플래그로 부른다. */
const IS_IF_STALE_MODE = process.argv.includes("--if-stale");

const OUTPUT_PATH = resolve(
  dirname(fileURLToPath(import.meta.url)),
  "../src/entities/apartment/model/archive.json",
);

const delay = (milliseconds: number) =>
  new Promise((resolve_) => setTimeout(resolve_, milliseconds));

/** 신고 지연을 감안해 어느 연도까지 확정으로 볼지 정한다. */
function resolveSettledThroughYear(now: Date): number {
  const year = now.getFullYear();
  const month = now.getMonth() + 1;

  if (month < SETTLED_PREVIOUS_YEAR_FROM_MONTH) {
    return year - 2;
  }

  return year - 1;
}

interface ApartmentArchive {
  generatedAt: string;
  settledThroughYear: number;
  apartments: Record<string, ApartmentYearPoint[]>;
}

/** 기존 아카이브. 없거나 깨졌으면 `null` ( 전 구간 재생성으로 떨어진다 ). */
function readExistingArchive(): ApartmentArchive | null {
  try {
    const parsed = JSON.parse(readFileSync(OUTPUT_PATH, "utf-8")) as ApartmentArchive;

    if (typeof parsed?.settledThroughYear !== "number" || !parsed?.apartments) {
      return null;
    }

    return parsed;
  } catch {
    return null;
  }
}

/**
 * 아카이브를 다시 만들어야 하는 이유. 최신이면 `null`.
 *
 * 집계 로직 변경은 감지할 수 없다. 그건 개발자가 직접 돌려야 한다.
 */
function resolveStaleReason(
  archive: ApartmentArchive | null,
  settledThroughYear: number,
): string | null {
  if (!archive) {
    return "아카이브 파일이 없습니다";
  }

  if (archive.settledThroughYear < settledThroughYear) {
    return `확정 연도가 밀렸습니다 (${archive.settledThroughYear} < ${settledThroughYear})`;
  }

  const missingLandmarks = landmarkApartmentList
    .filter((landmark) => !archive.apartments[landmark.apartmentID])
    .map((landmark) => landmark.displayName);

  if (missingLandmarks.length > 0) {
    return `아카이브에 없는 단지: ${missingLandmarks.join(", ")}`;
  }

  return null;
}

/**
 * 다시 받을 최근 연도 수.
 *
 * 신고 지연( 계약 후 30일 )과 뒤늦은 해제 신고는 몇 달 안에 들어오므로,
 * 최근 2년만 다시 받으면 과거 연도의 변화는 사실상 전부 잡힌다.
 * 2014년 거래가 2027년에 바뀌는 일은 없다.
 */
const REFETCH_RECENT_YEAR_COUNT = 2;

/**
 * 이 구를 어느 연도부터 다시 받을지 정한다.
 *
 * 기존 아카이브가 있으면 최근 몇 해만 받고 나머지는 재사용한다.
 * 다만 이 구에 아카이브가 없는 단지가 있으면( 랜드마크 추가 ) 전 구간이 필요하다.
 */
function resolveRefetchStartYear(
  lawdCode: string,
  archive: ApartmentArchive | null,
  settledThroughYear: number,
): number {
  if (!archive) {
    return CHART_START_YEAR;
  }

  const hasMissingLandmark = landmarkApartmentList
    .filter((landmark) => landmark.lawdCode === lawdCode)
    .some((landmark) => !archive.apartments[landmark.apartmentID]);

  if (hasMissingLandmark) {
    return CHART_START_YEAR;
  }

  return Math.max(CHART_START_YEAR, settledThroughYear - REFETCH_RECENT_YEAR_COUNT + 1);
}

/**
 * 재사용할 옛 연도와 새로 만든 연도를 합친다. **새로 만든 쪽이 이긴다.**
 *
 * 재조회 범위에 든 연도는 방금 값으로 덮이고, 그 이전 연도만 아카이브에서 살아남는다.
 */
function mergeYearPoints(
  archivedYearPoints: ApartmentYearPoint[],
  freshYearPoints: ApartmentYearPoint[],
): ApartmentYearPoint[] {
  const yearPointByYear = new Map<number, ApartmentYearPoint>();

  for (const yearPoint of [...archivedYearPoints, ...freshYearPoints]) {
    yearPointByYear.set(yearPoint.year, yearPoint);
  }

  return [...yearPointByYear.values()].sort((left, right) => left.year - right.year);
}

let requestCount = 0;

/** 무한 페이징 방어. 라우트와 동일한 값. */
const MAX_PAGES_PER_MONTH = 5;

/** 공공 API 한 페이지를 조회한다. 재시도 후에도 실패하면 던진다. */
async function fetchTradePageXml(
  lawdCode: string,
  dealYearMonth: string,
  pageNo: number,
): Promise<string> {
  let lastErrorMessage = "";

  for (let attempt = 1; attempt <= MAX_FETCH_ATTEMPTS; attempt += 1) {
    try {
      requestCount += 1;
      const response = await fetch(buildAptTradeUrl(SERVICE_KEY, lawdCode, dealYearMonth, pageNo));

      if (!response.ok) {
        lastErrorMessage = `HTTP ${response.status}`;
      } else {
        const xml = await response.text();

        if (isSuccessfulAptTradeResponse(xml)) {
          return xml;
        }

        lastErrorMessage = xml.includes("PER_SECOND") ? "초당 요청 제한 초과" : "응답 오류";
      }
    } catch (error) {
      lastErrorMessage = error instanceof Error ? error.message : "알 수 없는 오류";
    }

    if (attempt < MAX_FETCH_ATTEMPTS) {
      await delay(RETRY_BASE_DELAY_MS * 2 ** (attempt - 1));
    }
  }

  throw new Error(
    `실거래가 조회 실패 ${lawdCode}/${dealYearMonth} p${pageNo}: ${lastErrorMessage}`,
  );
}

/**
 * `(지역코드 × 월)` 한 칸을 **끝까지** 조회한다.
 *
 * `totalCount` 를 확인하지 않으면 `numOfRows` 를 넘는 달이 조용히 잘린다.
 * 아카이브는 한 번 커밋되면 그대로 굳으므로 여기서 잘리면 영구적이다.
 */
async function fetchMonthlyTrades(
  lawdCode: string,
  dealYearMonth: string,
): Promise<ApartmentTrade[]> {
  const trades: ApartmentTrade[] = [];
  let receivedItemCount = 0;

  for (let pageNo = 1; pageNo <= MAX_PAGES_PER_MONTH; pageNo += 1) {
    const xml = await fetchTradePageXml(lawdCode, dealYearMonth, pageNo);
    const itemCount = countItemElements(xml);

    trades.push(...parseAptTradeXml(xml));
    receivedItemCount += itemCount;

    if (receivedItemCount >= readTotalCount(xml) || itemCount === 0) {
      return trades;
    }

    await delay(MIN_REQUEST_INTERVAL_MS);
  }

  throw new Error(
    `실거래가 페이지 한도 초과 ${lawdCode}/${dealYearMonth}: ${MAX_PAGES_PER_MONTH}페이지로 부족`,
  );
}

/** 한 구의 확정 구간 전체를 순차 조회한다. 발사 간격을 지켜 초당 제한을 피한다. */
async function fetchDistrictArchiveTrades(
  lawdCode: string,
  startYear: number,
  endYear: number,
): Promise<ApartmentTrade[]> {
  const trades: ApartmentTrade[] = [];

  for (let year = startYear; year <= endYear; year += 1) {
    for (let month = 1; month <= 12; month += 1) {
      const dealYearMonth = `${year}${String(month).padStart(2, "0")}`;

      trades.push(...(await fetchMonthlyTrades(lawdCode, dealYearMonth)));
      await delay(MIN_REQUEST_INTERVAL_MS);
    }

    process.stdout.write(`\r  ${lawdCode}  ${startYear}~${endYear} 중 ${year} 완료   `);
  }

  process.stdout.write("\n");

  return trades;
}

async function main() {
  const settledThroughYear = resolveSettledThroughYear(new Date());
  const existingArchive = readExistingArchive();

  if (IS_IF_STALE_MODE) {
    const staleReason = resolveStaleReason(existingArchive, settledThroughYear);

    if (!staleReason) {
      console.log(`아파트 아카이브 최신 (확정 ~${settledThroughYear}). 생성을 건너뜁니다.`);
      return;
    }

    console.log(`아파트 아카이브 갱신이 필요합니다 — ${staleReason}`);
  }

  if (!SERVICE_KEY) {
    if (IS_IF_STALE_MODE) {
      console.warn("  DATA_GO_KR_SERVICE_KEY 가 없어 건너뜁니다. .env.local 을 확인하세요.");
      return;
    }

    console.error("DATA_GO_KR_SERVICE_KEY 가 없습니다. .env.local 을 확인하세요.");
    process.exit(1);
  }

  const startedAt = Date.now();

  /**
   * 증분 갱신은 `--if-stale` 에서만 한다.
   *
   * 수동 실행은 집계 로직을 바꿨을 때 돌리는 길이다. 그때 옛 연도를 재사용하면
   * 옛 로직으로 만든 값이 그대로 남으므로, 수동은 항상 전 구간을 다시 만든다.
   */
  const reusableArchive = IS_IF_STALE_MODE ? existingArchive : null;

  console.log(`아파트 실거래 아카이브 생성`);
  console.log(`  구간: ${CHART_START_YEAR} ~ ${settledThroughYear} (확정 연도만)`);
  console.log(`  방식: ${reusableArchive ? "증분 ( 최근 연도만 재조회 )" : "전 구간 재생성"}`);

  // 같은 구를 여러 단지가 공유하므로 구 단위로 한 번만 훑는다.
  const lawdCodes = [...new Set(landmarkApartmentList.map((landmark) => landmark.lawdCode))];

  console.log(`  대상: 단지 ${landmarkApartmentList.length}개 / 지역 ${lawdCodes.length}곳\n`);

  const refetchStartYearByLawdCode = new Map(
    lawdCodes.map((lawdCode) => [
      lawdCode,
      resolveRefetchStartYear(lawdCode, reusableArchive, settledThroughYear),
    ]),
  );

  const tradesByLawdCode = new Map<string, ApartmentTrade[]>();

  for (const lawdCode of lawdCodes) {
    const refetchStartYear = refetchStartYearByLawdCode.get(lawdCode) ?? CHART_START_YEAR;

    tradesByLawdCode.set(
      lawdCode,
      await fetchDistrictArchiveTrades(lawdCode, refetchStartYear, settledThroughYear),
    );
  }

  console.log("\nBTC 일별 시세 수집…");

  /**
   * **순차로** 받는다. `Promise.all` 로 24개를 동시에 쏘면 Upbit 초당 제한에 걸린다.
   * 첫 구현이 그랬고, 당시 실패가 조용히 삼켜져 아카이브 622개 버킷 중 290개가
   * BTC 시세 결측인 채로 생성됐다.
   */
  const btcStartYear = Math.min(...refetchStartYearByLawdCode.values());
  const btcDailyKrwMapByYear = new Map<number, BtcDailyKrwMap>();

  for (let year = btcStartYear; year <= settledThroughYear; year += 1) {
    btcDailyKrwMapByYear.set(year, await fetchBtcDailyKrwMap(year));
    process.stdout.write(`\r  ${year} 완료   `);
  }

  process.stdout.write("\n");

  const apartments: Record<string, ApartmentYearPoint[]> = {};

  for (const landmark of landmarkApartmentList) {
    const districtTrades = tradesByLawdCode.get(landmark.lawdCode) ?? [];
    const refetchStartYear = refetchStartYearByLawdCode.get(landmark.lawdCode) ?? CHART_START_YEAR;

    const years = [];

    for (let year = refetchStartYear; year <= settledThroughYear; year += 1) {
      // 첫 실거래 이전 연도는 담지 않는다. 빈 막대만 늘어난다.
      if (year >= landmark.earliestDealYear) {
        years.push({ year, settledThroughMonth: 12, isPartialYear: false });
      }
    }

    const freshYearPoints = buildYearPoints({
      landmark,
      districtTrades,
      years,
      btcDailyKrwMapByYear,
    });

    apartments[landmark.apartmentID] = mergeYearPoints(
      reusableArchive?.apartments[landmark.apartmentID] ?? [],
      freshYearPoints,
    );
  }

  /**
   * 생성 결과를 검증한다.
   *
   * 모든 거래가 BTC 로 환산됐어야 한다. 하나라도 빠졌다면 시세 Map 에 구멍이 있었다는
   * 뜻이고, 그대로 커밋하면 "일부 거래만 반영된 중앙값" 이 영구히 박힌다.
   */
  const brokenBuckets: string[] = [];

  for (const [apartmentID, yearPoints] of Object.entries(apartments)) {
    for (const yearPoint of yearPoints) {
      for (const bucket of yearPoint.areaBuckets) {
        if (bucket.btcConvertedDealCount !== bucket.dealCount) {
          brokenBuckets.push(
            `${apartmentID} ${yearPoint.year} ${bucket.areaInSquareMeter}㎡ ` +
              `(${bucket.btcConvertedDealCount}/${bucket.dealCount})`,
          );
        }
      }
    }
  }

  if (brokenBuckets.length > 0) {
    for (const broken of brokenBuckets.slice(0, 10)) {
      console.error(`   ${broken}`);
    }

    throw new Error(`BTC 환산 누락 ${brokenBuckets.length}건. 아카이브를 저장하지 않습니다`);
  }

  const archive = {
    generatedAt: new Date().toISOString().slice(0, 10),
    settledThroughYear,
    apartments,
  };

  writeFileSync(OUTPUT_PATH, `${JSON.stringify(archive, null, 2)}\n`, "utf-8");

  const sizeInKb = (JSON.stringify(archive).length / 1024).toFixed(1);
  const elapsedSeconds = ((Date.now() - startedAt) / 1000).toFixed(1);

  console.log(`\n완료`);
  console.log(`  공공 API 호출 ${requestCount}회 / ${elapsedSeconds}초`);
  console.log(`  ${OUTPUT_PATH}`);
  console.log(`  ${sizeInKb}KB`);

  for (const landmark of landmarkApartmentList) {
    const yearPoints = apartments[landmark.apartmentID];
    const withDeals = yearPoints.filter((point) => point.areaBuckets.length > 0).length;

    console.log(
      `    ${landmark.displayName.padEnd(20)} ${String(withDeals).padStart(2)}/${yearPoints.length}년`,
    );
  }
}

/**
 * `--if-stale` 은 실패해도 0 으로 끝낸다. 개발 서버 기동을 막지 않기 위해서다.
 * 수동 실행은 기존대로 실패를 그대로 드러낸다.
 */
try {
  await main();
} catch (error) {
  if (!IS_IF_STALE_MODE) {
    throw error;
  }

  console.warn(`
⚠ 아카이브 갱신 실패 — 기존 아카이브로 계속합니다.`);
  console.warn(`  ${error instanceof Error ? error.message : error}`);
  console.warn(`  런타임이 빈 구간을 실시간 조회로 메우므로 앱은 정상 동작합니다.`);
}
