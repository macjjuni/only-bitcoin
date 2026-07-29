import type { CompanyTreasuryHolding } from "@/entities/treasury";
import {
  convertCountryCodeToFlagEmoji,
  extractTickerCode,
  formatBtcAmount,
  formatPercent,
  formatSignedPercent,
  formatUsdCompact,
  formatUsdPrice,
} from "../lib/formatTreasury";

interface TreasuryCompanyRowProps {
  company: CompanyTreasuryHolding;
  /** 목록에서의 순위(1부터). */
  rank: number;
}

/** 기업 1곳의 보유 현황 행. */
export default function TreasuryCompanyRow({ company, rank }: TreasuryCompanyRowProps) {
  // region [Privates]
  const hasEntryData = company.totalEntryValueInUsd > 0;
  const isProfitable = company.unrealizedProfitRatePercent >= 0;
  const profitColorClassName = isProfitable ? "text-up" : "text-down";
  // endregion

  return (
    <li className="flex flex-col gap-2 border-b border-neutral-300 py-3 last:border-b-0 dark:border-neutral-600">
      <div className="flex items-start justify-between gap-2">
        <div className="flex min-w-0 items-start gap-2">
          <span className="font-number w-6 shrink-0 pt-0.5 text-sm font-bold text-muted-foreground">
            {rank}
          </span>
          <div className="flex min-w-0 flex-col">
            <span className="truncate text-sm font-bold">
              {convertCountryCodeToFlagEmoji(company.countryCode)} {company.companyName}
            </span>
            <span className="font-number text-xs text-muted-foreground">
              {extractTickerCode(company.tickerSymbol)}
            </span>
          </div>
        </div>

        <div className="flex shrink-0 flex-col items-end">
          <strong className="font-number text-sm font-bold text-bitcoin">
            {formatBtcAmount(company.totalHoldingsInBtc)}
          </strong>
          <span className="font-number text-xs text-muted-foreground">
            {formatUsdCompact(company.totalCurrentValueInUsd)}
          </span>
        </div>
      </div>

      <dl className="flex items-center justify-between gap-2 pl-8 text-xs">
        <div className="flex items-center gap-1">
          <dt className="text-muted-foreground">평단가</dt>
          <dd className="font-number font-bold">{formatUsdPrice(company.averageEntryPriceInUsd)}</dd>
        </div>
        <div className="flex items-center gap-1">
          <dt className="text-muted-foreground">수익률</dt>
          <dd className={`font-number font-bold ${hasEntryData ? profitColorClassName : ""}`}>
            {formatSignedPercent(company.unrealizedProfitRatePercent)}
          </dd>
        </div>
        <div className="flex items-center gap-1">
          <dt className="text-muted-foreground">발행량</dt>
          <dd className="font-number font-bold">
            {formatPercent(company.percentageOfTotalSupply, 3)}
          </dd>
        </div>
      </dl>
    </li>
  );
}
