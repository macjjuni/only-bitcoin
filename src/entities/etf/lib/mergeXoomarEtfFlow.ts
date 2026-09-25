import type { XoomarEtfFlowResponse, XoomarEtfFlowRowResponse } from "../model/types";

// region [Privates]
const buildEtfFlowRowKey = (row: XoomarEtfFlowRowResponse): string => {
  return `${row.asset}:${row.date}:${row.ticker.trim().toUpperCase()}`;
};

const compareEtfFlowRows = (
  firstRow: XoomarEtfFlowRowResponse,
  secondRow: XoomarEtfFlowRowResponse,
): number => {
  const dateComparison = secondRow.date.localeCompare(firstRow.date);

  if (dateComparison !== 0) {
    return dateComparison;
  }

  return firstRow.ticker.localeCompare(secondRow.ticker);
};

/**
 * 최근 응답의 측정값이 비어 있으면 아카이브에 남아 있던 값을 유지한다.
 *
 * 원천이 과거 구간의 `flowUsd`를 빈 값으로 되돌려주는 사례가 있어, 행을 통째로
 * 교체하면 이미 확보한 수치가 지워진다. 그래서 측정값은 필드 단위로 합친다.
 */
const preserveArchivedMeasurement = (
  archivedMeasurement: string | null,
  recentMeasurement: string | null,
): string | null => {
  return recentMeasurement ?? archivedMeasurement;
};

const mergeEtfFlowRow = (
  archivedRow: XoomarEtfFlowRowResponse | undefined,
  recentRow: XoomarEtfFlowRowResponse,
): XoomarEtfFlowRowResponse => {
  if (!archivedRow) {
    return recentRow;
  }

  return {
    ...recentRow,
    holdings: preserveArchivedMeasurement(archivedRow.holdings, recentRow.holdings),
    flowUsd: preserveArchivedMeasurement(archivedRow.flowUsd, recentRow.flowUsd),
    aumUsd: preserveArchivedMeasurement(archivedRow.aumUsd, recentRow.aumUsd),
  };
};
// endregion

/**
 * 아카이브와 최근 응답을 합친다. 같은 날짜와 티커가 있으면 뒤에 전달된 최근 응답을
 * 우선하되, 최근 응답의 측정값이 비어 있는 자리에는 아카이브 값을 남긴다.
 */
export const mergeXoomarEtfFlowResponses = (
  archivedResponse: XoomarEtfFlowResponse,
  recentResponse: XoomarEtfFlowResponse,
): XoomarEtfFlowResponse => {
  const rowByDateAndTicker = new Map<string, XoomarEtfFlowRowResponse>();

  for (const row of archivedResponse.data) {
    if (row.asset !== "btc") {
      continue;
    }

    rowByDateAndTicker.set(buildEtfFlowRowKey(row), row);
  }

  for (const row of recentResponse.data) {
    if (row.asset !== "btc") {
      continue;
    }

    const rowKey = buildEtfFlowRowKey(row);

    rowByDateAndTicker.set(rowKey, mergeEtfFlowRow(rowByDateAndTicker.get(rowKey), row));
  }

  return {
    data: [...rowByDateAndTicker.values()].sort(compareEtfFlowRows),
    updatedAt: recentResponse.updatedAt || archivedResponse.updatedAt,
    source: recentResponse.source || archivedResponse.source,
    docs: recentResponse.docs || archivedResponse.docs,
  };
};
