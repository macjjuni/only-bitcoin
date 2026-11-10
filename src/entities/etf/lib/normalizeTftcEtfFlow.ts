import type {
  BitcoinEtfDailyFlow,
  BitcoinEtfSnapshot,
  TftcEtfFlowDayResponse,
  TftcEtfFlowResponse,
} from "../model/types";

// region [Privates]
const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

const toFiniteNumber = (value: unknown): number | null => {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
};

const toPositiveNumber = (value: unknown): number | null => {
  const finiteNumber = toFiniteNumber(value);
  return finiteNumber !== null && finiteNumber > 0 ? finiteNumber : null;
};

/** 티커를 대문자로 맞추고 숫자가 아닌 값은 버림. */
const normalizeFundFlows = (perEtfUsd: TftcEtfFlowDayResponse["perEtfUsd"]) => {
  const fundFlowsInUsd: Record<string, number> = {};

  for (const [ticker, flowInUsd] of Object.entries(perEtfUsd ?? {})) {
    const normalizedTicker = ticker.trim().toUpperCase();
    const finiteFlowInUsd = toFiniteNumber(flowInUsd);

    if (normalizedTicker && finiteFlowInUsd !== null) {
      fundFlowsInUsd[normalizedTicker] = finiteFlowInUsd;
    }
  }

  return fundFlowsInUsd;
};

/**
 * 한 행을 정규화함. 못 쓰는 행은 null.
 * 순유입이 0 이고 ETF별 내역도 없는 행은 미국 휴장일임. ( 원천의 정의 )
 * 그대로 두면 차트에 빈 막대가 생기고 연속 유입·유출 일수가 끊겨서 뺌.
 */
const normalizeDailyFlow = (day: TftcEtfFlowDayResponse): BitcoinEtfDailyFlow | null => {
  if (!day || typeof day.date !== "string" || !ISO_DATE_PATTERN.test(day.date)) {
    return null;
  }

  const netFlowInUsd = toFiniteNumber(day.netFlowUsd);
  if (netFlowInUsd === null) {
    return null;
  }

  const fundFlowsInUsd = normalizeFundFlows(day.perEtfUsd);
  const isMarketHoliday = netFlowInUsd === 0 && Object.keys(fundFlowsInUsd).length === 0;
  if (isMarketHoliday) {
    return null;
  }

  return {
    date: day.date,
    netFlowInUsd,
    totalNetAssetsInUsd: toPositiveNumber(day.totalNetAssetsUsd),
    bitcoinCloseInUsd: toPositiveNumber(day.btcCloseUsd),
    fundFlowsInUsd,
  };
};
// endregion

/** 조회 실패 시 화면이 안전하게 그릴 수 있는 빈 스냅샷. */
export const createEmptyBitcoinEtfSnapshot = (): BitcoinEtfSnapshot => {
  return { dailyFlows: [], sourceUpdatedAt: "", hasFetchFailed: true };
};

/**
 * TFTC 응답을 화면용 스냅샷으로 정리함.
 * 날짜가 겹치면 뒤에 온 행을 쓰고, 쓸 수 있는 거래일이 하나도 없으면 실패로 봄.
 */
export const normalizeTftcEtfFlowResponse = (response: TftcEtfFlowResponse): BitcoinEtfSnapshot => {
  if (!response || !Array.isArray(response.days)) {
    return createEmptyBitcoinEtfSnapshot();
  }

  const dailyFlowByDate = new Map<string, BitcoinEtfDailyFlow>();
  for (const day of response.days) {
    const dailyFlow = normalizeDailyFlow(day);
    if (dailyFlow) {
      dailyFlowByDate.set(dailyFlow.date, dailyFlow);
    }
  }

  const dailyFlows = [...dailyFlowByDate.values()].sort((firstFlow, secondFlow) => {
    return firstFlow.date.localeCompare(secondFlow.date);
  });
  if (dailyFlows.length === 0) {
    return createEmptyBitcoinEtfSnapshot();
  }

  return {
    dailyFlows,
    sourceUpdatedAt: typeof response.dateModified === "string" ? response.dateModified : "",
    hasFetchFailed: false,
  };
};
