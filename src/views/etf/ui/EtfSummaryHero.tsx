import type { ReactNode } from "react";
import type { EtfFlowDirection, EtfOverview } from "../lib/buildEtfOverview";
import {
  formatEtfAumInKrw,
  formatEtfAumInUsd,
  formatEtfDate,
  formatEtfHoldingsInBtc,
  formatSignedEtfFlowInKrw,
  formatSignedEtfFlowInUsd,
} from "../lib/formatEtf";

interface EtfSummaryHeroProps {
  overview: EtfOverview;
  usdExRate: number;
}

interface PeriodFlowProps {
  label: string;
  flowInUsd: number;
  usdExRate: number;
}

interface StatRowProps {
  label: string;
  /** 이름 아래 작은 설명. 계산 기준처럼 값만 봐선 모르는 것. */
  caption?: string;
  value: string;
  valueClassName?: string;
  subValue: ReactNode;
}

const BITCOIN_MAX_SUPPLY = 21_000_000;

const STREAK_BADGE_CLASS_NAME: Record<EtfFlowDirection, string> = {
  inflow: "bg-up/10 text-up",
  outflow: "bg-down/10 text-down",
  flat: "bg-foreground/10 text-muted-foreground",
};

// region [Privates]
const resolveFlowColorClassName = (flowInUsd: number): string => {
  if (flowInUsd === 0) {
    return "text-muted-foreground";
  }
  return flowInUsd > 0 ? "text-up" : "text-down";
};

const resolveStreakLabel = (direction: EtfFlowDirection, dayCount: number): string => {
  if (direction === "flat") {
    return "보합";
  }
  const directionLabel = direction === "inflow" ? "유입" : "유출";
  return dayCount > 1 ? `${dayCount}거래일 연속 ${directionLabel}` : directionLabel;
};
// endregion

/** 요약 카드 아래쪽의 기간 합계 한 칸. 매일 바뀌는 값이라 큰 숫자 바로 밑에 둠. */
function PeriodFlow({ label, flowInUsd, usdExRate }: PeriodFlowProps) {
  return (
    <div>
      <dt className="text-[11px] font-medium text-muted-foreground">{label}</dt>
      <dd
        className={`mt-1 font-number whitespace-nowrap text-base font-black ${resolveFlowColorClassName(flowInUsd)}`}
      >
        {formatSignedEtfFlowInUsd(flowInUsd)}
      </dd>
      <dd className="mt-0.5 font-number text-[11px] font-bold text-muted-foreground">
        {formatSignedEtfFlowInKrw(flowInUsd, usdExRate)}
      </dd>
    </div>
  );
}

/** 주요 지표 한 줄. 왼쪽에 이름, 오른쪽에 값. */
function StatRow({ label, caption, value, valueClassName = "", subValue }: StatRowProps) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-3 last:border-0">
      <dt className="min-w-0">
        <span className="block text-sm font-bold">{label}</span>
        {caption && (
          <span className="mt-0.5 block text-[11px] text-muted-foreground">{caption}</span>
        )}
      </dt>
      <dd className="shrink-0 text-right">
        <strong className={`font-number block text-base font-black ${valueClassName}`}>
          {value}
        </strong>
        <span className="mt-0.5 block font-number text-[11px] font-bold text-muted-foreground">
          {subValue}
        </span>
      </dd>
    </div>
  );
}

/**
 * 맨 위 요약. 매일 바뀌는 값( 최근 거래일 · 7 · 30거래일 )은 요약 카드 하나에 모으고,
 * 천천히 바뀌는 값은 아래 목록 카드에 한 줄씩 둠. 칸을 여러 개 늘어놓으면 강약이 없어서 이렇게 나눔.
 */
export default function EtfSummaryHero({ overview, usdExRate }: EtfSummaryHeroProps) {
  // region [Privates]
  const streakLabel = resolveStreakLabel(overview.streakDirection, overview.streakDayCount);
  const hasFundBreakdown = overview.latestFundCount > 0;
  const unchangedFundCount =
    overview.latestFundCount - overview.latestInflowFundCount - overview.latestOutflowFundCount;
  const supplySharePercent =
    overview.estimatedHoldingsInBtc === null
      ? null
      : (overview.estimatedHoldingsInBtc / BITCOIN_MAX_SUPPLY) * 100;
  // endregion

  return (
    <section className="flex select-none flex-col gap-2.5 font-pretendard">
      <div className="card-surface flex flex-col p-4">
        <div className="mb-3 flex items-start justify-between gap-3">
          <div className="flex flex-col gap-1">
            <h2 className="text-lg font-bold">BTC 현물 ETF 순유입</h2>
            <strong className="-mt-1 font-number text-xs tracking-tight text-muted-foreground">
              {formatEtfDate(overview.latestDate)} 거래일
            </strong>
          </div>
          <span
            className={`shrink-0 rounded-full px-2.5 py-2 text-[10px] font-bold ${STREAK_BADGE_CLASS_NAME[overview.streakDirection]}`}
          >
            {streakLabel}
          </span>
        </div>
        <strong
          className={`font-number block text-[clamp(2rem,10vw,3.1rem)] font-black leading-none tracking-normal ${resolveFlowColorClassName(overview.latestNetFlowInUsd)}`}
        >
          {formatSignedEtfFlowInUsd(overview.latestNetFlowInUsd)}
        </strong>
        <span className="mt-1.5 font-number text-sm font-bold tracking-normal">
          {formatSignedEtfFlowInKrw(overview.latestNetFlowInUsd, usdExRate)}
        </span>
        <p className="mt-2 text-xs text-muted-foreground">
          {hasFundBreakdown ? (
            <>
              <span className="font-number">{overview.latestFundCount}</span>개 ETF 중 유입{" "}
              <span className="font-number font-bold text-up">
                {overview.latestInflowFundCount}
              </span>{" "}
              · 유출{" "}
              <span className="font-number font-bold text-down">
                {overview.latestOutflowFundCount}
              </span>{" "}
              · 변동 없음 <span className="font-number font-bold">{unchangedFundCount}</span>
            </>
          ) : (
            "이 거래일의 ETF별 내역은 아직 집계되지 않았습니다."
          )}
        </p>

        <dl className="mt-4 grid grid-cols-2 gap-3 border-t border-border pt-4">
          <PeriodFlow
            label="최근 7거래일"
            flowInUsd={overview.sevenDayNetFlowInUsd}
            usdExRate={usdExRate}
          />
          <PeriodFlow
            label="최근 30거래일"
            flowInUsd={overview.thirtyDayNetFlowInUsd}
            usdExRate={usdExRate}
          />
        </dl>
      </div>

      <div className="card-surface">
        <h2 className="px-4 pb-1 pt-4 text-base font-bold">주요 지표</h2>
        <dl>
          <StatRow
            label="누적 순유입"
            caption={`${formatEtfDate(overview.firstDate)} 상장 이후`}
            value={formatSignedEtfFlowInUsd(overview.cumulativeNetFlowInUsd)}
            valueClassName={resolveFlowColorClassName(overview.cumulativeNetFlowInUsd)}
            subValue={formatSignedEtfFlowInKrw(overview.cumulativeNetFlowInUsd, usdExRate)}
          />
          <StatRow
            label="전체 운용자산"
            value={formatEtfAumInUsd(overview.totalNetAssetsInUsd)}
            subValue={formatEtfAumInKrw(overview.totalNetAssetsInUsd, usdExRate)}
          />
          <StatRow
            label="추정 보유량"
            caption="운용자산 ÷ BTC 가격"
            value={formatEtfHoldingsInBtc(overview.estimatedHoldingsInBtc)}
            subValue={
              supplySharePercent === null ? (
                "-"
              ) : (
                <>
                  총 발행량의 <span className="text-bitcoin">{supplySharePercent.toFixed(2)}%</span>
                </>
              )
            }
          />
          <StatRow
            label="역대 최대 유입일"
            value={
              overview.largestInflow
                ? formatSignedEtfFlowInUsd(overview.largestInflow.netFlowInUsd)
                : "-"
            }
            valueClassName={overview.largestInflow ? "text-up" : ""}
            subValue={overview.largestInflow ? formatEtfDate(overview.largestInflow.date) : "-"}
          />
          <StatRow
            label="역대 최대 유출일"
            value={
              overview.largestOutflow
                ? formatSignedEtfFlowInUsd(overview.largestOutflow.netFlowInUsd)
                : "-"
            }
            valueClassName={overview.largestOutflow ? "text-down" : ""}
            subValue={overview.largestOutflow ? formatEtfDate(overview.largestOutflow.date) : "-"}
          />
        </dl>
      </div>
    </section>
  );
}
