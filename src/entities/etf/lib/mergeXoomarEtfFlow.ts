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
// endregion

/**
 * 아카이브와 최근 응답을 합친다. 같은 날짜와 티커가 있으면 뒤에 전달된 최근 응답을 우선한다.
 */
export const mergeXoomarEtfFlowResponses = (
  archivedResponse: XoomarEtfFlowResponse,
  recentResponse: XoomarEtfFlowResponse,
): XoomarEtfFlowResponse => {
  const rowByDateAndTicker = new Map<string, XoomarEtfFlowRowResponse>();

  for (const row of [...archivedResponse.data, ...recentResponse.data]) {
    if (row.asset !== "btc") {
      continue;
    }

    rowByDateAndTicker.set(buildEtfFlowRowKey(row), row);
  }

  return {
    data: [...rowByDateAndTicker.values()].sort(compareEtfFlowRows),
    updatedAt: recentResponse.updatedAt || archivedResponse.updatedAt,
    source: recentResponse.source || archivedResponse.source,
    docs: recentResponse.docs || archivedResponse.docs,
  };
};
