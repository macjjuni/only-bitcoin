/**
 * BTC 월별 달러 종가 아카이브 생성 스크립트.
 *
 * 확정된 과거 연도는 값이 변하지 않으므로 매번 blockchain.com 을 훑을 이유가 없다.
 * 이 스크립트가 한 번 수집해 `btcMonthlyUsdArchive.json` 으로 떨궈 두면, 런타임에는
 * 아카이브 이후 구간만 조회하면 된다. ( 재생성당 17회 → 1회 )
 *
 * 앱 런타임이 아니라 **개발자가 수동으로** 돌린다.
 *   pnpm build:btc-monthly-usd-archive            항상 재생성
 *   pnpm build:btc-monthly-usd-archive --if-stale 낡았을 때만 재생성 ( pnpm dev 가 부른다 )
 *
 * 다시 돌려야 할 때
 * - 해가 바뀌고 2월이 지난 뒤 ( 직전 연도 확정 )           -> --if-stale 이 감지한다
 * - 집계 로직을 바꿨을 때                                  -> 감지 못 한다. 직접 돌려야 한다
 *
 * `--if-stale` 은 실패해도 종료 코드 0 이다. 개발 서버 기동을 막지 않기 위해서다.
 * 아카이브가 낡아도 런타임이 빈 구간을 실시간으로 메우므로 앱은 정상 동작한다.
 *
 * 앱과 **같은 조회 모듈을 그대로 import** 한다. 로직을 복제하지 않으므로
 * 아카이브와 런타임 결과가 어긋날 여지가 없다.
 */

import { readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  FIRST_TRADING_YEAR,
  fetchBtcMonthlyUsdMap,
} from "../src/entities/bitcoin/lib/btcMonthlyUsd";

/**
 * 직전 연도를 아카이브에 담아도 되는 최소 월.
 *
 * BTC 시세는 부동산과 달리 신고 지연이 없으므로 1월이 되면 직전 연도는 바로 확정이다.
 * 다만 1월 1일에 스크립트를 돌리면 blockchain.com 이 12월 31일 데이터를 아직 안 줄 수 있어
 * 여유로 2월부터 직전 연도를 확정으로 본다.
 */
const SETTLED_PREVIOUS_YEAR_FROM_MONTH = 2;

/** 낡았을 때만 생성하는 모드. `pnpm dev` 가 이 플래그로 부른다. */
const IS_IF_STALE_MODE = process.argv.includes("--if-stale");

const OUTPUT_PATH = resolve(
  dirname(fileURLToPath(import.meta.url)),
  "../src/entities/bitcoin/model/btcMonthlyUsdArchive.json",
);

interface BtcMonthlyUsdArchive {
  generatedAt: string;
  settledThroughYear: number;
  monthlyUsdClose: Record<string, number>;
}

/** 어느 연도까지 확정으로 볼지 정한다. */
function resolveSettledThroughYear(now: Date): number {
  const year = now.getFullYear();
  const month = now.getMonth() + 1;

  if (month < SETTLED_PREVIOUS_YEAR_FROM_MONTH) {
    return year - 2;
  }

  return year - 1;
}

/** 기존 아카이브. 없거나 깨졌으면 `null` ( 전 구간 재생성으로 떨어진다 ). */
function readExistingArchive(): BtcMonthlyUsdArchive | null {
  try {
    const parsed = JSON.parse(readFileSync(OUTPUT_PATH, "utf-8")) as BtcMonthlyUsdArchive;

    if (typeof parsed?.settledThroughYear !== "number" || !parsed?.monthlyUsdClose) {
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
  archive: BtcMonthlyUsdArchive | null,
  settledThroughYear: number,
): string | null {
  if (!archive) {
    return "아카이브 파일이 없습니다";
  }

  if (archive.settledThroughYear < settledThroughYear) {
    return `확정 연도가 밀렸습니다 (${archive.settledThroughYear} < ${settledThroughYear})`;
  }

  return null;
}

/**
 * 아카이브에서 재사용할 확정 연도 데이터를 추린다.
 *
 * 새 settledThroughYear 범위 안에 든 기존 데이터만 살리고,
 * 나머지는 API 로 다시 받는다.
 */
function extractReusableEntries(
  archive: BtcMonthlyUsdArchive,
  refetchStartYear: number,
): Map<string, number> {
  const reusable = new Map<string, number>();

  for (const [monthKey, price] of Object.entries(archive.monthlyUsdClose)) {
    const entryYear = Number.parseInt(monthKey.slice(0, 4), 10);

    if (entryYear < refetchStartYear) {
      reusable.set(monthKey, price);
    }
  }

  return reusable;
}

async function main() {
  const settledThroughYear = resolveSettledThroughYear(new Date());
  const existingArchive = readExistingArchive();

  if (IS_IF_STALE_MODE) {
    const staleReason = resolveStaleReason(existingArchive, settledThroughYear);

    if (!staleReason) {
      console.log(`BTC 월별 USD 아카이브 최신 (확정 ~${settledThroughYear}). 생성을 건너뜁니다.`);
      return;
    }

    console.log(`BTC 월별 USD 아카이브 갱신이 필요합니다 — ${staleReason}`);
  }

  const startedAt = Date.now();

  /**
   * 증분 갱신은 `--if-stale` 에서만 한다.
   *
   * 수동 실행은 집계 로직을 바꿨을 때 돌리는 길이다. 그때 옛 연도를 재사용하면
   * 옛 로직으로 만든 값이 그대로 남으므로, 수동은 항상 전 구간을 다시 만든다.
   */
  const reusableArchive = IS_IF_STALE_MODE ? existingArchive : null;

  /**
   * 증분 갱신이면 새로 확정된 연도만 API 로 받고 나머지는 재사용한다.
   * 전 구간 재생성이면 FIRST_TRADING_YEAR 부터 전부 받는다.
   */
  const refetchStartYear = reusableArchive
    ? reusableArchive.settledThroughYear + 1
    : FIRST_TRADING_YEAR;

  console.log("BTC 월별 USD 종가 아카이브 생성");
  console.log(`  구간: ${FIRST_TRADING_YEAR} ~ ${settledThroughYear} (확정 연도만)`);
  console.log(`  방식: ${reusableArchive ? "증분 ( 새 확정 연도만 재조회 )" : "전 구간 재생성"}`);

  if (refetchStartYear > settledThroughYear && reusableArchive) {
    console.log("  재조회할 연도가 없습니다. 기존 아카이브를 유지합니다.");
    return;
  }

  const monthlyUsdClose = reusableArchive
    ? extractReusableEntries(reusableArchive, refetchStartYear)
    : new Map<string, number>();

  /** 순차로 받는다. 동시에 쏘면 blockchain.com 제한에 걸린다. */
  for (let year = refetchStartYear; year <= settledThroughYear; year += 1) {
    const yearMap = await fetchBtcMonthlyUsdMap(year);

    for (const [monthKey, price] of yearMap) {
      monthlyUsdClose.set(monthKey, price);
    }

    process.stdout.write(`\r  ${year} 완료   `);
  }

  process.stdout.write("\n");

  /** 커버리지 검증. 확정 연도인데 12개월이 안 차면 중단한다. */
  for (let year = FIRST_TRADING_YEAR; year <= settledThroughYear; year += 1) {
    const expectedMonths = year === FIRST_TRADING_YEAR ? 5 : 12; // 2010 은 08~12 만
    let actualMonths = 0;

    for (let month = 1; month <= 12; month += 1) {
      const monthKey = `${year}-${String(month).padStart(2, "0")}`;

      if (monthlyUsdClose.has(monthKey)) {
        actualMonths += 1;
      }
    }

    if (actualMonths < expectedMonths) {
      throw new Error(
        `커버리지 부족 (${year}): ${actualMonths}개월 / 최소 ${expectedMonths}개월 필요`,
      );
    }
  }

  /** 키 정렬. JSON 이 깔끔해진다. */
  const sortedEntries = [...monthlyUsdClose.entries()].sort(([a], [b]) => a.localeCompare(b));

  const archive: BtcMonthlyUsdArchive = {
    generatedAt: new Date().toISOString().slice(0, 10),
    settledThroughYear,
    monthlyUsdClose: Object.fromEntries(sortedEntries),
  };

  writeFileSync(OUTPUT_PATH, `${JSON.stringify(archive, null, 2)}\n`, "utf-8");

  const sizeInKb = (JSON.stringify(archive).length / 1024).toFixed(1);
  const elapsedSeconds = ((Date.now() - startedAt) / 1000).toFixed(1);
  const entryCount = sortedEntries.length;

  console.log("\n완료");
  console.log(
    `  blockchain.com 호출 ${settledThroughYear - refetchStartYear + 1}회 / ${elapsedSeconds}초`,
  );
  console.log(`  ${OUTPUT_PATH}`);
  console.log(`  ${sizeInKb}KB / ${entryCount}개월`);
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
