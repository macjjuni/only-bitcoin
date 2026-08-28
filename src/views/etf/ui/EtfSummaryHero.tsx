import type { BitcoinEtfDailyFlow, BitcoinEtfSummary } from "@/entities/etf";
import {
  formatEtfAumInKrw,
  formatEtfAumInUsd,
  formatEtfDate,
  formatEtfHoldingsInBtc,
  formatEtfUpdatedAt,
  formatSignedEtfFlowInKrw,
  formatSignedEtfFlowInUsd,
} from "../lib/formatEtf";

interface EtfSummaryHeroProps {
  summary: BitcoinEtfSummary;
  dailyFlows: BitcoinEtfDailyFlow[];
  sourceUpdatedAt: string;
  usdExRate: number;
}

const PANEL_CLASS_NAME = "rounded-xl border border-border bg-background/55 glass-bg";

export function EtfSummaryHero({
  summary,
  dailyFlows,
  sourceUpdatedAt,
  usdExRate,
}: EtfSummaryHeroProps) {
  // region [Privates]
  const sevenTradingDayNetFlowInUsd = dailyFlows
    .slice(-7)
    .reduce((accumulatedFlowInUsd, dailyFlow) => {
      return accumulatedFlowInUsd + dailyFlow.estimatedNetFlowInUsd;
    }, 0);
  const dailyFlowColorClassName = summary.estimatedNetFlowInUsd >= 0 ? "text-up" : "text-down";
  const sevenDayFlowColorClassName = sevenTradingDayNetFlowInUsd >= 0 ? "text-up" : "text-down";
  const isLatestSourceDatePartiallyReported = summary.latestSourceDate !== summary.referenceDate;
  const hasExcludedFlow = summary.excludedFlowCount > 0;
  const formattedUpdatedAt = formatEtfUpdatedAt(sourceUpdatedAt);
  // endregion

  return (
    <section className="select-none font-pretendard">
      <div className="flex flex-col">
        <div className={`${PANEL_CLASS_NAME} flex flex-col gap-1 mb-2.5 p-4`}>
          <div className="mb-2 flex items-start justify-between gap-3">
            <div className="flex flex-col gap-1">
              <span className="text-lg font-bold">BTC 현물 ETF 순유입</span>
              <strong className="-mt-1 font-number text-xs text-muted-foreground tracking-tight">
                {formatEtfDate(summary.referenceDate)} 기준
              </strong>
            </div>
            <span className="shrink-0 rounded-full bg-up/10 px-2.5 py-2 text-[10px] font-bold text-up">
              최신 업데이트
            </span>
          </div>
          <strong
            className={`font-number block text-[clamp(2rem,10vw,3.1rem)] font-black leading-none tracking-normal ${dailyFlowColorClassName}`}
          >
            {formatSignedEtfFlowInUsd(summary.estimatedNetFlowInUsd)}
          </strong>
          <span className="font-number text-sm font-bold tracking-normal">
            {formatSignedEtfFlowInKrw(summary.estimatedNetFlowInUsd, usdExRate)}
          </span>
          <p className="mt-2 text-xs text-muted-foreground">
            {summary.validFlowFundCount}/{summary.trackedFundCount}개 ETF 흐름 반영
          </p>
          <p className="mt-1 text-[11px] text-muted-foreground">
            데이터 업데이트 · {formattedUpdatedAt}
          </p>
        </div>

        <dl className="grid grid-cols-2 gap-2.5">
          <div className={`${PANEL_CLASS_NAME} p-3`}>
            <dt className="mb-2 text-xs font-medium text-muted-foreground">최근 7거래일</dt>
            <dd
              className={`font-number whitespace-nowrap text-lg font-black ${sevenDayFlowColorClassName}`}
            >
              {formatSignedEtfFlowInUsd(sevenTradingDayNetFlowInUsd)}
            </dd>
            <dd className="mt-1 font-number text-xs font-bold text-muted-foreground">
              {formatSignedEtfFlowInKrw(sevenTradingDayNetFlowInUsd, usdExRate)}
            </dd>
          </div>
          <div className={`${PANEL_CLASS_NAME} p-3`}>
            <dt className="mb-2 text-[11px] font-medium text-muted-foreground">추적 BTC</dt>
            <dd className="font-number whitespace-nowrap text-lg font-black">
              {formatEtfHoldingsInBtc(summary.totalHoldingsInBtc)}
            </dd>
          </div>
          <div className={`${PANEL_CLASS_NAME} col-span-2 px-3 py-4`}>
            <dt className="mb-2 text-xs font-medium text-muted-foreground">추정 운용자산</dt>
            <dd className="font-number whitespace-nowrap text-lg font-black tracking-normal">
              {formatEtfAumInUsd(summary.estimatedAumInUsd)}
            </dd>
            <dd className="mt-1 font-number text-xs font-bold text-muted-foreground">
              {formatEtfAumInKrw(summary.estimatedAumInUsd, usdExRate)}
            </dd>
          </div>
        </dl>

        {(isLatestSourceDatePartiallyReported || hasExcludedFlow) && (
          <div className="mt-3 rounded-lg bg-bitcoin/10 px-3 py-2.5 text-sm leading-relaxed text-foreground">
            <strong className="font-bold text-bitcoin">집계 상태</strong>
            <span className="ml-1.5">
              최신 원천일은 {formatEtfDate(summary.latestSourceDate)}이며, 모든 ETF가 있는 기준일을
              사용했습니다.
              {hasExcludedFlow
                ? ` 비정상 흐름 ${summary.excludedFlowCount}건은 합계에서 제외했습니다.`
                : ""}
            </span>
          </div>
        )}
      </div>
    </section>
  );
}
