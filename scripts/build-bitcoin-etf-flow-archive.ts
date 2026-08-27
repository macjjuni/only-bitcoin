/**
 * Xoomar 비트코인 ETF 전체 이력 아카이브 생성 스크립트.
 *
 * 최초 실행과 수동 실행은 전체 CSV를 받고, `--if-stale` 실행은 기존 아카이브에
 * 최근 구간을 겹쳐 받아 정정된 행까지 덮어쓴다.
 *
 *   pnpm build:bitcoin-etf-flow-archive
 *   pnpm build:bitcoin-etf-flow-archive --if-stale
 */

import { readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { mergeXoomarEtfFlowResponses } from "../src/entities/etf/lib/mergeXoomarEtfFlow";
import { parseXoomarBitcoinEtfCsv } from "../src/entities/etf/lib/parseXoomarEtfCsv";
import type {
  BitcoinEtfFlowArchive,
  XoomarEtfFlowResponse,
  XoomarEtfFlowRowResponse,
} from "../src/entities/etf/model/types";

const IS_IF_STALE_MODE = process.argv.includes("--if-stale");
const XOOMAR_ETF_CSV_URL = "https://xoomar.com/api/markets/etf-flows/csv";
const XOOMAR_ETF_JSON_URL = "https://xoomar.com/api/markets/etf-flows";
const XOOMAR_ETF_SOURCE = "xoomar.com";
const XOOMAR_ETF_DOCS_URL = "https://xoomar.com/markets/api/etf-flows";
const ARCHIVE_MAX_AGE_IN_MILLISECONDS = 12 * 60 * 60 * 1000;
const RECENT_OVERLAP_DAY_COUNT = 30;
const MAX_INCREMENTAL_REQUEST_DAY_COUNT = 180;
const MILLISECONDS_PER_DAY = 24 * 60 * 60 * 1000;
const OUTPUT_PATH = resolve(
  dirname(fileURLToPath(import.meta.url)),
  "../src/entities/etf/model/bitcoinEtfFlowArchive.json",
);

// region [Privates]
const buildXoomarRequestHeaders = (accept: string): HeadersInit => {
  const xoomarApiKey = process.env.XOOMAR_API_KEY?.trim();
  const headers: Record<string, string> = { accept };

  if (xoomarApiKey) {
    headers["X-API-Key"] = xoomarApiKey;
  }

  return headers;
};

const readExistingArchive = (): BitcoinEtfFlowArchive | null => {
  try {
    const parsedArchive = JSON.parse(readFileSync(OUTPUT_PATH, "utf-8")) as BitcoinEtfFlowArchive;

    if (
      !Array.isArray(parsedArchive.rows) ||
      parsedArchive.rows.length === 0 ||
      !parsedArchive.generatedAt ||
      !parsedArchive.latestSourceDate
    ) {
      return null;
    }

    return parsedArchive;
  } catch {
    return null;
  }
};

const resolveStaleReason = (archive: BitcoinEtfFlowArchive | null, now: Date): string | null => {
  if (!archive) {
    return "아카이브 파일이 없거나 손상됐습니다";
  }

  const generatedTimestamp = Date.parse(archive.generatedAt);

  if (!Number.isFinite(generatedTimestamp)) {
    return "생성 시각이 올바르지 않습니다";
  }

  if (now.getTime() - generatedTimestamp >= ARCHIVE_MAX_AGE_IN_MILLISECONDS) {
    return "마지막 갱신 후 12시간이 지났습니다";
  }

  return null;
};

const buildArchivedResponse = (archive: BitcoinEtfFlowArchive): XoomarEtfFlowResponse => {
  return {
    data: archive.rows,
    updatedAt: archive.sourceUpdatedAt,
    source: XOOMAR_ETF_SOURCE,
    docs: XOOMAR_ETF_DOCS_URL,
  };
};

const resolveIncrementalRequestDayCount = (latestSourceDate: string, now: Date): number => {
  const latestSourceTimestamp = Date.parse(`${latestSourceDate}T00:00:00.000Z`);

  if (!Number.isFinite(latestSourceTimestamp)) {
    return MAX_INCREMENTAL_REQUEST_DAY_COUNT + 1;
  }

  const missingCalendarDayCount = Math.max(
    0,
    Math.ceil((now.getTime() - latestSourceTimestamp) / MILLISECONDS_PER_DAY),
  );

  return missingCalendarDayCount + RECENT_OVERLAP_DAY_COUNT;
};

const normalizeArchiveRows = (rows: XoomarEtfFlowRowResponse[]): XoomarEtfFlowRowResponse[] => {
  return rows.map((row) => {
    return {
      date: row.date,
      ticker: row.ticker,
      issuer: row.issuer,
      asset: row.asset,
      holdings: row.holdings,
      flowUsd: row.flowUsd,
      aumUsd: row.aumUsd,
    };
  });
};

const resolveLatestSourceDate = (rows: XoomarEtfFlowRowResponse[]): string => {
  return rows.reduce((latestDate, row) => {
    return row.date > latestDate ? row.date : latestDate;
  }, "");
};

const validateArchiveRows = (rows: XoomarEtfFlowRowResponse[]): void => {
  if (rows.length === 0) {
    throw new Error("저장할 비트코인 ETF 행이 없습니다.");
  }

  const tickerCount = new Set(rows.map(({ ticker }) => ticker)).size;

  if (tickerCount < 9) {
    throw new Error(`ETF 티커가 예상보다 적습니다: ${tickerCount}개`);
  }
};
// endregion

// region [Transactions]
const fetchFullXoomarEtfResponse = async (now: Date): Promise<XoomarEtfFlowResponse> => {
  const response = await fetch(XOOMAR_ETF_CSV_URL, {
    headers: buildXoomarRequestHeaders("text/csv"),
  });

  if (!response.ok) {
    throw new Error(`Xoomar ETF CSV 조회 실패: HTTP ${response.status}`);
  }

  return {
    data: parseXoomarBitcoinEtfCsv(await response.text()),
    updatedAt: now.toISOString(),
    source: XOOMAR_ETF_SOURCE,
    docs: XOOMAR_ETF_DOCS_URL,
  };
};

const fetchRecentXoomarEtfResponse = async (
  requestDayCount: number,
): Promise<XoomarEtfFlowResponse> => {
  const requestUrl = `${XOOMAR_ETF_JSON_URL}?asset=btc&days=${requestDayCount}`;
  const response = await fetch(requestUrl, {
    headers: buildXoomarRequestHeaders("application/json"),
  });

  if (!response.ok) {
    throw new Error(`Xoomar ETF 최근 구간 조회 실패: HTTP ${response.status}`);
  }

  const xoomarResponse = (await response.json()) as XoomarEtfFlowResponse;

  if (!Array.isArray(xoomarResponse.data)) {
    throw new Error("Xoomar ETF 최근 구간 응답 형식이 올바르지 않습니다.");
  }

  return xoomarResponse;
};
// endregion

const main = async (): Promise<void> => {
  const now = new Date();
  const existingArchive = readExistingArchive();

  if (IS_IF_STALE_MODE) {
    const staleReason = resolveStaleReason(existingArchive, now);

    if (!staleReason) {
      console.log(
        `비트코인 ETF 아카이브 최신 (${existingArchive?.latestSourceDate}). 갱신을 건너뜁니다.`,
      );
      return;
    }

    console.log(`비트코인 ETF 아카이브 갱신 필요: ${staleReason}`);
  }

  const startedAt = Date.now();
  let mergedResponse: XoomarEtfFlowResponse;
  let updateMode: string;

  if (IS_IF_STALE_MODE && existingArchive) {
    const requestDayCount = resolveIncrementalRequestDayCount(
      existingArchive.latestSourceDate,
      now,
    );

    if (requestDayCount <= MAX_INCREMENTAL_REQUEST_DAY_COUNT) {
      const recentResponse = await fetchRecentXoomarEtfResponse(requestDayCount);
      mergedResponse = mergeXoomarEtfFlowResponses(
        buildArchivedResponse(existingArchive),
        recentResponse,
      );
      updateMode = `증분 갱신 (최근 ${requestDayCount}일 재조회)`;
    } else {
      mergedResponse = await fetchFullXoomarEtfResponse(now);
      updateMode = "전체 CSV 재생성 (아카이브 장기 미갱신)";
    }
  } else {
    mergedResponse = await fetchFullXoomarEtfResponse(now);
    updateMode = "전체 CSV 재생성";
  }

  const archiveRows = normalizeArchiveRows(mergedResponse.data);
  validateArchiveRows(archiveRows);

  const archive: BitcoinEtfFlowArchive = {
    generatedAt: now.toISOString(),
    latestSourceDate: resolveLatestSourceDate(archiveRows),
    sourceUpdatedAt: mergedResponse.updatedAt || now.toISOString(),
    rows: archiveRows,
  };

  writeFileSync(OUTPUT_PATH, `${JSON.stringify(archive)}\n`, "utf-8");

  const elapsedSeconds = ((Date.now() - startedAt) / 1000).toFixed(1);
  const archiveSizeInKilobytes = (JSON.stringify(archive).length / 1024).toFixed(1);

  console.log("비트코인 ETF 아카이브 갱신 완료");
  console.log(`  방식: ${updateMode}`);
  console.log(`  원천일: ${archive.latestSourceDate}`);
  console.log(`  데이터: ${archive.rows.length.toLocaleString("ko-KR")}행`);
  console.log(`  크기: ${archiveSizeInKilobytes}KB / ${elapsedSeconds}초`);
  console.log(`  경로: ${OUTPUT_PATH}`);
};

try {
  await main();
} catch (error) {
  if (!IS_IF_STALE_MODE) {
    throw error;
  }

  console.warn("비트코인 ETF 아카이브 갱신 실패 - 기존 아카이브로 계속합니다.");
  console.warn(`  ${error instanceof Error ? error.message : error}`);
}
