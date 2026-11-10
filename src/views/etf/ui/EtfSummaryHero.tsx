import type { EtfFlowDirection, EtfFlowRecord, EtfOverview } from "../lib/buildEtfOverview";
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

interface FlowTileProps {
  label: string;
  flowInUsd: number;
  usdExRate: number;
}

interface RecordTileProps {
  label: string;
  record: EtfFlowRecord | null;
}

/** 요약 수치 칸. 공용 카드 표면을 그대로 씀. */
const PANEL_CLASS_NAME = "card-surface";
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

/** 기간 합계 한 칸. 달러와 원화를 같이 보여 줌. */
function FlowTile({ label, flowInUsd, usdExRate }: FlowTileProps) {
  return (
    <div className={`${PANEL_CLASS_NAME} p-3`}>
      <dt className="mb-2 text-xs font-medium text-muted-foreground">{label}</dt>
      <dd
        className={`font-number whitespace-nowrap text-lg font-black ${resolveFlowColorClassName(flowInUsd)}`}
      >
        {formatSignedEtfFlowInUsd(flowInUsd)}
      </dd>
      <dd className="mt-1 font-number text-xs font-bold text-muted-foreground">
        {formatSignedEtfFlowInKrw(flowInUsd, usdExRate)}
      </dd>
    </div>
  );
}

/** 역대 최대 유입·유출일 한 칸. */
function RecordTile({ label, record }: RecordTileProps) {
  return (
    <div className={`${PANEL_CLASS_NAME} p-3`}>
      <dt className="mb-2 text-xs font-medium text-muted-foreground">{label}</dt>
      <dd
        className={`font-number whitespace-nowrap text-lg font-black ${resolveFlowColorClassName(record?.netFlowInUsd ?? 0)}`}
      >
        {record ? formatSignedEtfFlowInUsd(record.netFlowInUsd) : "-"}
      </dd>
      <dd className="mt-1 font-number text-xs font-bold text-muted-foreground">
        {record ? formatEtfDate(record.date) : "-"}
      </dd>
    </div>
  );
}

/** 최근 거래일 순유입과 기간·누적 요약. */
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
      <div className={`${PANEL_CLASS_NAME} flex flex-col gap-1 p-4`}>
        <div className="mb-2 flex items-start justify-between gap-3">
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
        <span className="font-number text-sm font-bold tracking-normal">
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
      </div>

      <dl className="grid grid-cols-2 gap-2.5">
        <FlowTile
          label="최근 7거래일"
          flowInUsd={overview.sevenDayNetFlowInUsd}
          usdExRate={usdExRate}
        />
        <FlowTile
          label="최근 30거래일"
          flowInUsd={overview.thirtyDayNetFlowInUsd}
          usdExRate={usdExRate}
        />
        <FlowTile
          label={`누적 순유입 · ${formatEtfDate(overview.firstDate)}~`}
          flowInUsd={overview.cumulativeNetFlowInUsd}
          usdExRate={usdExRate}
        />
        <div className={`${PANEL_CLASS_NAME} p-3`}>
          <dt className="mb-2 text-xs font-medium text-muted-foreground">전체 운용자산</dt>
          <dd className="font-number whitespace-nowrap text-lg font-black">
            {formatEtfAumInUsd(overview.totalNetAssetsInUsd)}
          </dd>
          <dd className="mt-1 font-number text-xs font-bold text-muted-foreground">
            {formatEtfAumInKrw(overview.totalNetAssetsInUsd, usdExRate)}
          </dd>
        </div>
        <div className={`${PANEL_CLASS_NAME} col-span-2 px-3 py-4`}>
          <dt className="mb-2 text-xs font-medium text-muted-foreground">
            추정 보유량 · 운용자산 ÷ BTC 가격
          </dt>
          <dd className="font-number whitespace-nowrap text-lg font-black">
            {formatEtfHoldingsInBtc(overview.estimatedHoldingsInBtc)}
          </dd>
          {supplySharePercent !== null && (
            <dd className="mt-1 text-xs font-bold text-muted-foreground">
              총 발행량 2,100만 BTC의{" "}
              <span className="font-number text-bitcoin">{supplySharePercent.toFixed(2)}%</span>
            </dd>
          )}
        </div>
        <RecordTile label="역대 최대 유입일" record={overview.largestInflow} />
        <RecordTile label="역대 최대 유출일" record={overview.largestOutflow} />
      </dl>
    </section>
  );
}
