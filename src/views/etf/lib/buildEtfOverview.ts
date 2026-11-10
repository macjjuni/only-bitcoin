import type { BitcoinEtfDailyFlow } from "@/entities/etf";

export type EtfFlowDirection = "inflow" | "outflow" | "flat";

/** 차트 한 점. 일별 막대와 누적 차트가 같은 배열을 씀. */
export interface EtfChartPoint {
  date: string;
  netFlowInUsd: number;
  bitcoinCloseInUsd: number | null;
}

/** ETF 하나의 기간별 순유입 합계. */
export interface EtfFundFlow {
  ticker: string;
  latestInUsd: number;
  sevenDayInUsd: number;
  thirtyDayInUsd: number;
  cumulativeInUsd: number;
}

export interface EtfFlowRecord {
  date: string;
  netFlowInUsd: number;
}

export interface EtfOverview {
  firstDate: string;
  latestDate: string;
  tradingDayCount: number;
  latestNetFlowInUsd: number;
  /** 최근 거래일에 내역이 보고된 ETF 수. 내역이 없는 날이면 0. */
  latestFundCount: number;
  latestInflowFundCount: number;
  latestOutflowFundCount: number;
  streakDirection: EtfFlowDirection;
  /** 최근 거래일과 같은 방향이 이어진 거래일 수. 보합이면 0. */
  streakDayCount: number;
  sevenDayNetFlowInUsd: number;
  thirtyDayNetFlowInUsd: number;
  cumulativeNetFlowInUsd: number;
  totalNetAssetsInUsd: number | null;
  /** 운용자산 ÷ 같은 날 BTC 가격. 발행사가 공시한 보유량이 아니라 환산값임. */
  estimatedHoldingsInBtc: number | null;
  largestInflow: EtfFlowRecord | null;
  largestOutflow: EtfFlowRecord | null;
  chartPoints: EtfChartPoint[];
  fundFlows: EtfFundFlow[];
}

const SEVEN_TRADING_DAYS = 7;
const THIRTY_TRADING_DAYS = 30;

// region [Privates]
const resolveDirection = (netFlowInUsd: number): EtfFlowDirection => {
  if (netFlowInUsd === 0) {
    return "flat";
  }
  return netFlowInUsd > 0 ? "inflow" : "outflow";
};

const sumNetFlow = (dailyFlows: BitcoinEtfDailyFlow[]): number => {
  return dailyFlows.reduce((sum, dailyFlow) => sum + dailyFlow.netFlowInUsd, 0);
};

/** 최근 거래일부터 거슬러 올라가며 같은 방향이 이어진 날을 셈. */
const countStreakDays = (dailyFlows: BitcoinEtfDailyFlow[], direction: EtfFlowDirection) => {
  if (direction === "flat") {
    return 0;
  }

  let streakDayCount = 0;
  for (let index = dailyFlows.length - 1; index >= 0; index -= 1) {
    if (resolveDirection(dailyFlows[index].netFlowInUsd) !== direction) {
      break;
    }
    streakDayCount += 1;
  }
  return streakDayCount;
};

const sumFundFlow = (dailyFlows: BitcoinEtfDailyFlow[], ticker: string): number => {
  return dailyFlows.reduce((sum, dailyFlow) => sum + (dailyFlow.fundFlowsInUsd[ticker] ?? 0), 0);
};

/** 한 번이라도 내역에 나온 ETF 전부를 누적 순유입이 큰 순서로 정리함. */
const buildFundFlows = (dailyFlows: BitcoinEtfDailyFlow[]): EtfFundFlow[] => {
  const tickers = new Set(dailyFlows.flatMap(({ fundFlowsInUsd }) => Object.keys(fundFlowsInUsd)));
  const latestDailyFlow = dailyFlows.at(-1);
  const sevenDayFlows = dailyFlows.slice(-SEVEN_TRADING_DAYS);
  const thirtyDayFlows = dailyFlows.slice(-THIRTY_TRADING_DAYS);

  return [...tickers]
    .map((ticker) => ({
      ticker,
      latestInUsd: latestDailyFlow?.fundFlowsInUsd[ticker] ?? 0,
      sevenDayInUsd: sumFundFlow(sevenDayFlows, ticker),
      thirtyDayInUsd: sumFundFlow(thirtyDayFlows, ticker),
      cumulativeInUsd: sumFundFlow(dailyFlows, ticker),
    }))
    .sort((firstFund, secondFund) => secondFund.cumulativeInUsd - firstFund.cumulativeInUsd);
};

const findRecord = (
  dailyFlows: BitcoinEtfDailyFlow[],
  direction: "inflow" | "outflow",
): EtfFlowRecord | null => {
  const record = dailyFlows.reduce<BitcoinEtfDailyFlow | null>((currentRecord, dailyFlow) => {
    if (resolveDirection(dailyFlow.netFlowInUsd) !== direction) {
      return currentRecord;
    }
    if (!currentRecord) {
      return dailyFlow;
    }
    return Math.abs(dailyFlow.netFlowInUsd) > Math.abs(currentRecord.netFlowInUsd)
      ? dailyFlow
      : currentRecord;
  }, null);

  return record ? { date: record.date, netFlowInUsd: record.netFlowInUsd } : null;
};
// endregion

/**
 * 일별 흐름( 날짜 오름차순 )에서 화면에 쓰는 요약을 한 번에 뽑음.
 * 서버에서 계산해 두고 클라이언트엔 가벼운 배열만 넘기려는 용도. 거래일이 없으면 null.
 */
export const buildEtfOverview = (dailyFlows: BitcoinEtfDailyFlow[]): EtfOverview | null => {
  const firstDailyFlow = dailyFlows.at(0);
  const latestDailyFlow = dailyFlows.at(-1);
  if (!firstDailyFlow || !latestDailyFlow) {
    return null;
  }

  const latestFundFlows = Object.values(latestDailyFlow.fundFlowsInUsd);
  const streakDirection = resolveDirection(latestDailyFlow.netFlowInUsd);
  // 운용자산과 가격이 둘 다 있는 가장 최근 날. 최신 날에 자산이 아직 안 들어왔을 수 있음.
  const latestValuedFlow = dailyFlows.findLast(({ totalNetAssetsInUsd, bitcoinCloseInUsd }) => {
    return totalNetAssetsInUsd !== null && bitcoinCloseInUsd !== null;
  });
  const latestNetAssetsFlow = dailyFlows.findLast(({ totalNetAssetsInUsd }) => {
    return totalNetAssetsInUsd !== null;
  });

  return {
    firstDate: firstDailyFlow.date,
    latestDate: latestDailyFlow.date,
    tradingDayCount: dailyFlows.length,
    latestNetFlowInUsd: latestDailyFlow.netFlowInUsd,
    latestFundCount: latestFundFlows.length,
    latestInflowFundCount: latestFundFlows.filter((flowInUsd) => flowInUsd > 0).length,
    latestOutflowFundCount: latestFundFlows.filter((flowInUsd) => flowInUsd < 0).length,
    streakDirection,
    streakDayCount: countStreakDays(dailyFlows, streakDirection),
    sevenDayNetFlowInUsd: sumNetFlow(dailyFlows.slice(-SEVEN_TRADING_DAYS)),
    thirtyDayNetFlowInUsd: sumNetFlow(dailyFlows.slice(-THIRTY_TRADING_DAYS)),
    cumulativeNetFlowInUsd: sumNetFlow(dailyFlows),
    totalNetAssetsInUsd: latestNetAssetsFlow?.totalNetAssetsInUsd ?? null,
    estimatedHoldingsInBtc:
      latestValuedFlow?.totalNetAssetsInUsd && latestValuedFlow.bitcoinCloseInUsd
        ? latestValuedFlow.totalNetAssetsInUsd / latestValuedFlow.bitcoinCloseInUsd
        : null,
    largestInflow: findRecord(dailyFlows, "inflow"),
    largestOutflow: findRecord(dailyFlows, "outflow"),
    chartPoints: dailyFlows.map(({ date, netFlowInUsd, bitcoinCloseInUsd }) => {
      return { date, netFlowInUsd, bitcoinCloseInUsd };
    }),
    fundFlows: buildFundFlows(dailyFlows),
  };
};
