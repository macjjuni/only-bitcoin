import type { ExchangeMeta } from "@/entities/exchange";
import type { WithdrawComparisonRow } from "../lib/calculateWithdrawFee";
import { ExchangeFeeRow } from "./ExchangeFeeRow";
import { ASSET_THEME } from "./exchangeFeeTheme";

interface NetworkFeeCardProps {
  exchanges: ExchangeMeta[];
  row: WithdrawComparisonRow;
}

// region [Templates]
export function NetworkFeeCard({ exchanges, row }: NetworkFeeCardProps) {
  const supportedExchangeCount = Object.keys(row.cells).length;
  const supportedExchangeLabel = `${supportedExchangeCount}/${exchanges.length} 지원`;

  return (
    <section className="overflow-hidden rounded-xl border border-border bg-background/60">
      <header className="flex items-center justify-between gap-3 border-b border-border bg-muted/25 px-3 py-2.5">
        <div className="flex min-w-0 items-center gap-2">
          <span
            className={`rounded-md px-2 py-1 text-xs font-black ${ASSET_THEME[row.asset].badge}`}
          >
            {row.asset}
          </span>
          <h3 className="truncate text-sm font-bold">{row.networkName}</h3>
        </div>
        <span className="shrink-0 text-xs font-medium text-muted-foreground">
          {supportedExchangeLabel}
        </span>
      </header>

      <div className="grid grid-cols-[5.5rem_minmax(0,1fr)_minmax(0,1fr)] gap-2 border-b border-border bg-muted/15 px-3 py-1 text-[10px] font-bold text-muted-foreground">
        <span>거래소</span>
        <span className="text-right">출금 수수료</span>
        <span className="text-right">최소 출금</span>
      </div>

      <div className="divide-y">
        {exchanges.map((exchange) => (
          <ExchangeFeeRow
            key={exchange.id}
            asset={row.asset}
            cell={row.cells[exchange.id]}
            exchange={exchange}
          />
        ))}
      </div>
    </section>
  );
}
// endregion
