import { formatCollectedAt } from "../lib/formatCoinMap";

interface CoinMapCollectedAtProps {
  fetchedAt: string;
}

/**
 * 마지막 수집 시각 바. 자산 랭킹 요약 바와 같은 모양.
 * ISR 이라 HTML 생성 시각과 수집 시각이 같아서 지연 표시는 안 둠.
 */
export default function CoinMapCollectedAt({ fetchedAt }: CoinMapCollectedAtProps) {
  return (
    <p className="glass-bg flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border bg-background/55 px-3.5 py-2.5 text-[11px] font-bold text-muted-foreground">
      <span className="flex items-center gap-1.5">
        <span className="size-1.5 shrink-0 rounded-full bg-up" />
        마지막 수집
      </span>
      <time dateTime={fetchedAt} className="font-number text-xs font-black text-foreground">
        {formatCollectedAt(fetchedAt)}
      </time>
    </p>
  );
}
