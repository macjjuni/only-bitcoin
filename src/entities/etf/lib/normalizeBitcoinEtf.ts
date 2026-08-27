import type {
  BitcoinEtfDailyFlow,
  BitcoinEtfFundSnapshot,
  BitcoinEtfSnapshot,
  XoomarEtfFlowResponse,
  XoomarEtfFlowRowResponse,
} from "../model/types";

const MAX_DAILY_FLOW_TO_AUM_RATIO = 0.5;

interface DateFundGroup {
  date: string;
  funds: BitcoinEtfFundSnapshot[];
}

// region [Privates]
const parseOptionalNumber = (value: string | null): number | null => {
  if (value === null || value.trim() === "") {
    return null;
  }

  const parsedNumber = Number(value);

  return Number.isFinite(parsedNumber) ? parsedNumber : null;
};

const isValidSourceRow = (row: XoomarEtfFlowRowResponse): boolean => {
  return row.asset === "btc" && /^\d{4}-\d{2}-\d{2}$/.test(row.date) && row.ticker.trim() !== "";
};

/**
 * 하루 추정 흐름이 같은 날 AUM의 절반 이상이면 파일 단위 변경이나 파싱 오류일 가능성이
 * 높다고 보고 합산에서 제외한다. 원본 행은 숨기지 않고 화면에서 검증 제외 상태로 표시한다.
 */
export const isEstimatedFlowOutlier = (
  estimatedFlowInUsd: number | null,
  estimatedAumInUsd: number | null,
): boolean => {
  if (estimatedFlowInUsd === null) {
    return false;
  }

  if (estimatedAumInUsd === null || estimatedAumInUsd <= 0) {
    return estimatedFlowInUsd !== 0;
  }

  return Math.abs(estimatedFlowInUsd) / estimatedAumInUsd >= MAX_DAILY_FLOW_TO_AUM_RATIO;
};

const normalizeFundSnapshot = (row: XoomarEtfFlowRowResponse): BitcoinEtfFundSnapshot => {
  const estimatedFlowInUsd = parseOptionalNumber(row.flowUsd);
  const estimatedAumInUsd = parseOptionalNumber(row.aumUsd);

  return {
    date: row.date,
    ticker: row.ticker.trim().toUpperCase(),
    issuer: row.issuer.trim(),
    holdingsInBtc: parseOptionalNumber(row.holdings),
    estimatedFlowInUsd,
    estimatedAumInUsd,
    isEstimatedFlowExcluded: isEstimatedFlowOutlier(estimatedFlowInUsd, estimatedAumInUsd),
  };
};

const groupFundsByDate = (funds: BitcoinEtfFundSnapshot[]): DateFundGroup[] => {
  const dateTickerFundMap = new Map<string, Map<string, BitcoinEtfFundSnapshot>>();

  for (const fund of funds) {
    const tickerFundMap = dateTickerFundMap.get(fund.date) ?? new Map();
    tickerFundMap.set(fund.ticker, fund);
    dateTickerFundMap.set(fund.date, tickerFundMap);
  }

  return Array.from(dateTickerFundMap.entries())
    .map(([date, tickerFundMap]) => ({ date, funds: Array.from(tickerFundMap.values()) }))
    .sort((firstGroup, secondGroup) => secondGroup.date.localeCompare(firstGroup.date));
};

const resolveReferenceGroup = (
  dateFundGroups: DateFundGroup[],
  trackedFundCount: number,
): DateFundGroup | null => {
  const fullyCoveredGroup = dateFundGroups.find(({ funds }) => funds.length === trackedFundCount);

  if (fullyCoveredGroup) {
    return fullyCoveredGroup;
  }

  return (
    [...dateFundGroups].sort((firstGroup, secondGroup) => {
      const coverageDifference = secondGroup.funds.length - firstGroup.funds.length;

      if (coverageDifference !== 0) {
        return coverageDifference;
      }

      return secondGroup.date.localeCompare(firstGroup.date);
    })[0] ?? null
  );
};

const buildDailyFlow = (group: DateFundGroup): BitcoinEtfDailyFlow => {
  const validFlowFunds = group.funds.filter((fund) => {
    return fund.estimatedFlowInUsd !== null && !fund.isEstimatedFlowExcluded;
  });
  const excludedFlowCount = group.funds.filter(
    ({ isEstimatedFlowExcluded }) => isEstimatedFlowExcluded,
  ).length;
  const estimatedNetFlowInUsd = validFlowFunds.reduce((accumulatedFlowInUsd, fund) => {
    return accumulatedFlowInUsd + (fund.estimatedFlowInUsd ?? 0);
  }, 0);

  return {
    date: group.date,
    estimatedNetFlowInUsd,
    reportedFundCount: group.funds.length,
    validFlowFundCount: validFlowFunds.length,
    excludedFlowCount,
  };
};

const buildChartDailyFlows = (
  dateFundGroups: DateFundGroup[],
  trackedFundCount: number,
  fallbackFundCount: number,
): BitcoinEtfDailyFlow[] => {
  const fullyCoveredGroups = dateFundGroups.filter(
    ({ funds }) => funds.length === trackedFundCount,
  );
  const chartSourceGroups = fullyCoveredGroups.length
    ? fullyCoveredGroups
    : dateFundGroups.filter(({ funds }) => funds.length === fallbackFundCount);

  return chartSourceGroups
    .map(buildDailyFlow)
    .sort((firstDailyFlow, secondDailyFlow) =>
      firstDailyFlow.date.localeCompare(secondDailyFlow.date),
    );
};
// endregion

/** API 조회 실패 시 페이지가 안전하게 렌더링할 수 있는 빈 스냅샷. */
export const createEmptyBitcoinEtfSnapshot = (sourceUpdatedAt: string): BitcoinEtfSnapshot => {
  return {
    summary: {
      referenceDate: "",
      latestSourceDate: "",
      trackedFundCount: 0,
      reportedFundCount: 0,
      validFlowFundCount: 0,
      excludedFlowCount: 0,
      estimatedNetFlowInUsd: 0,
      totalHoldingsInBtc: 0,
      estimatedAumInUsd: 0,
      isFullCoverage: false,
    },
    dailyFlows: [],
    funds: [],
    sourceUpdatedAt,
    hasFetchFailed: true,
  };
};

/** Xoomar 원본 응답을 기준일이 일치하는 ETF 페이지 모델로 정규화한다. */
export const normalizeBitcoinEtfResponse = (
  response: XoomarEtfFlowResponse,
): BitcoinEtfSnapshot => {
  const normalizedFunds = response.data.filter(isValidSourceRow).map(normalizeFundSnapshot);
  const trackedTickers = new Set(normalizedFunds.map(({ ticker }) => ticker));
  const trackedFundCount = trackedTickers.size;
  const dateFundGroups = groupFundsByDate(normalizedFunds);
  const referenceGroup = resolveReferenceGroup(dateFundGroups, trackedFundCount);

  if (!referenceGroup) {
    return createEmptyBitcoinEtfSnapshot(response.updatedAt);
  }

  const referenceDailyFlow = buildDailyFlow(referenceGroup);
  const totalHoldingsInBtc = referenceGroup.funds.reduce((accumulatedHoldingsInBtc, fund) => {
    return accumulatedHoldingsInBtc + (fund.holdingsInBtc ?? 0);
  }, 0);
  const estimatedAumInUsd = referenceGroup.funds.reduce((accumulatedAumInUsd, fund) => {
    return accumulatedAumInUsd + (fund.estimatedAumInUsd ?? 0);
  }, 0);
  const sortedReferenceFunds = [...referenceGroup.funds].sort((firstFund, secondFund) => {
    return (secondFund.estimatedAumInUsd ?? 0) - (firstFund.estimatedAumInUsd ?? 0);
  });

  return {
    summary: {
      referenceDate: referenceGroup.date,
      latestSourceDate: dateFundGroups[0]?.date ?? referenceGroup.date,
      trackedFundCount,
      reportedFundCount: referenceGroup.funds.length,
      validFlowFundCount: referenceDailyFlow.validFlowFundCount,
      excludedFlowCount: referenceDailyFlow.excludedFlowCount,
      estimatedNetFlowInUsd: referenceDailyFlow.estimatedNetFlowInUsd,
      totalHoldingsInBtc,
      estimatedAumInUsd,
      isFullCoverage: referenceGroup.funds.length === trackedFundCount,
    },
    dailyFlows: buildChartDailyFlows(dateFundGroups, trackedFundCount, referenceGroup.funds.length),
    funds: sortedReferenceFunds,
    sourceUpdatedAt: response.updatedAt,
    hasFetchFailed: false,
  };
};
