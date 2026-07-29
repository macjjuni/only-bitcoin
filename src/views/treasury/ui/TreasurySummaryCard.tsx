import type { PublicTreasurySummary } from "@/entities/treasury";
import { Card, CardContent } from "@/shared/ui";
import {
  formatBtcAmount,
  formatKstDateTime,
  formatPercent,
  formatSignedPercent,
  formatSignedUsdCompact,
  formatUsdCompact,
} from "../lib/formatTreasury";

interface TreasurySummaryCardProps {
  summary: PublicTreasurySummary;
  /** 스냅샷을 만든 시각(ISO 8601). */
  fetchedAt: string;
}

/** 상장기업 전체 합산 지표. 서버 컴포넌트로 두어 크롤러가 보는 HTML 에 그대로 포함되게 한다. */
export default function TreasurySummaryCard({ summary, fetchedAt }: TreasurySummaryCardProps) {
  // region [Privates]
  const isProfitable = summary.unrealizedProfitInUsd >= 0;
  const profitColorClassName = isProfitable ? "text-up" : "text-down";
  // endregion

  return (
    <Card>
      <CardContent className="flex flex-col gap-3 p-4">
        <div className="flex flex-col gap-1">
          <span className="text-sm text-muted-foreground">상장기업이 보유한 비트코인</span>
          <strong className="font-number text-2xl font-bold text-bitcoin break-all">
            {formatBtcAmount(summary.totalHoldingsInBtc)}
          </strong>
          <span className="font-number text-sm text-muted-foreground">
            ≈ {formatUsdCompact(summary.totalValueInUsd)}
          </span>
        </div>

        <dl className="flex flex-col gap-2 border-t border-neutral-300 pt-3 text-sm dark:border-neutral-600">
          <div className="flex items-start justify-between gap-2">
            <dt className="shrink-0 text-muted-foreground">전체 발행량 대비</dt>
            <dd className="font-number font-bold text-right break-all">
              {formatPercent(summary.marketCapDominancePercent)}
            </dd>
          </div>
          <div className="flex items-start justify-between gap-2">
            <dt className="shrink-0 text-muted-foreground">매입 총액</dt>
            <dd className="font-number font-bold text-right break-all">
              {formatUsdCompact(summary.totalEntryValueInUsd)}
            </dd>
          </div>
          <div className="flex items-start justify-between gap-2">
            <dt className="shrink-0 text-muted-foreground">평가손익</dt>
            <dd className={`font-number font-bold text-right break-all ${profitColorClassName}`}>
              {formatSignedUsdCompact(summary.unrealizedProfitInUsd)}
              <span className="ml-1 text-xs">
                ({formatSignedPercent(summary.unrealizedProfitRatePercent)})
              </span>
            </dd>
          </div>
          <div className="flex items-start justify-between gap-2">
            <dt className="shrink-0 text-muted-foreground">집계 기업 수</dt>
            <dd className="font-number font-bold text-right break-all">
              {summary.companyCount.toLocaleString("ko-KR")}곳
            </dd>
          </div>
        </dl>

        <p className="text-xs leading-relaxed text-muted-foreground">
          업데이트 <span className="font-number">{formatKstDateTime(fetchedAt)}</span>
        </p>
      </CardContent>
    </Card>
  );
}
