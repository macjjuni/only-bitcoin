import type { RankedAsset } from "@/entities/asset-ranking";
import { BitcoinIcon } from "@/shared/ui/icon";
import { formatAssetPrice, formatDailyChange, formatMarketCap } from "../lib/formatAssetRanking";

interface BitcoinRankCardProps {
  bitcoin: RankedAsset;
  precedingAsset?: RankedAsset;
  rankedAssetCount: number;
}

export default function BitcoinRankCard({
  bitcoin,
  precedingAsset,
  rankedAssetCount,
}: BitcoinRankCardProps) {
  // region [Privates]
  const formattedMarketCap = formatMarketCap(bitcoin.marketCapInUsd);
  const formattedPrice = formatAssetPrice(bitcoin.priceInUsd);
  const formattedDailyChange = formatDailyChange(bitcoin.dailyChangePercent);
  const changeColorClassName =
    bitcoin.dailyChangePercent === null || bitcoin.dailyChangePercent === 0
      ? "text-muted-foreground"
      : bitcoin.dailyChangePercent > 0
        ? "text-up"
        : "text-down";
  const marketCapGapInUsd = precedingAsset
    ? precedingAsset.marketCapInUsd - bitcoin.marketCapInUsd
    : 0;
  const hasPrecedingAssetComparison = Boolean(precedingAsset) && marketCapGapInUsd > 0;
  const comparisonPercent = precedingAsset
    ? Math.min(100, (bitcoin.marketCapInUsd / precedingAsset.marketCapInUsd) * 100)
    : 100;
  const formattedGap = formatMarketCap(marketCapGapInUsd);
  const formattedComparisonPercent = `${comparisonPercent.toFixed(1)}%`;
  const comparisonBarStyle = { width: `${comparisonPercent}%` };
  const comparisonDescription = `비트코인 시가총액은 ${precedingAsset?.name ?? "상위 자산"}의 ${formattedComparisonPercent}`;
  // endregion

  return (
    <section
      aria-label="비트코인 자산 순위"
      className="relative isolate overflow-hidden rounded-2xl border border-bitcoin/25 bg-background"
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-16 -top-16 -z-10 size-64 rounded-full bg-bitcoin/15 blur-3xl"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-[72px] -top-14 -z-10 text-bitcoin opacity-[0.04] dark:opacity-[0.05]"
      >
        <BitcoinIcon size={280} />
      </div>

      <div className="px-5 pb-5 pt-5">
        <div className="flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-2.5">
            <span
              aria-hidden="true"
              className="flex size-9 shrink-0 items-center justify-center rounded-full bg-white text-bitcoin shadow-[0_4px_16px_rgb(var(--bitcoin-rgb)/0.2)]"
            >
              <BitcoinIcon size={36} />
            </span>
            <div>
              <p className="font-number mb-0.5 text-[10px] font-bold tracking-[0.16em] text-bitcoin">
                BITCOIN · BTC
              </p>
              <h2 className="text-sm font-bold leading-snug">비트코인의 현재 위치</h2>
            </div>
          </div>
          <span className="font-number shrink-0 rounded-full border border-bitcoin/20 bg-bitcoin/10 px-2.5 py-1 text-[10px] font-bold text-bitcoin">
            TOP {rankedAssetCount}
          </span>
        </div>

        <div className="mt-6 flex items-end justify-between gap-3">
          <div>
            <p className="mb-2 text-[11px] font-medium text-muted-foreground">전 세계 자산 순위</p>
            <p className="font-number flex items-baseline gap-1.5 text-bitcoin">
              <strong className="text-[clamp(3.5rem,16vw,4.75rem)] font-black leading-[0.85] tracking-[-0.06em]">
                {bitcoin.rank}
              </strong>
              <span className="text-xl font-bold">위</span>
            </p>
          </div>
          <dl className="min-w-0 text-right">
            <dt className="mb-1 text-[11px] font-medium text-muted-foreground">시가총액</dt>
            <dd className="font-number text-[26px] font-black leading-none tracking-tight">
              {formattedMarketCap}
            </dd>
            <dd className="font-number mt-2 text-xs text-muted-foreground">
              가격 {formattedPrice}
            </dd>
            <dd className={`font-number mt-1 text-xs font-bold ${changeColorClassName}`}>
              <span className="mr-1.5 font-pretendard text-[11px] font-medium text-muted-foreground">
                당일
              </span>
              {formattedDailyChange}
            </dd>
          </dl>
        </div>
      </div>

      {hasPrecedingAssetComparison && precedingAsset && (
        <div className="border-t border-bitcoin/15 bg-background/55 px-5 py-4">
          <div className="mb-3 flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="mb-0.5 text-[11px] text-muted-foreground">
                바로 위 <span className="font-number">{precedingAsset.rank}위</span>
              </p>
              <p className="break-words text-sm font-bold">{precedingAsset.name}</p>
            </div>
            <div className="shrink-0 text-right">
              <p className="mb-0.5 text-[11px] text-muted-foreground">시가총액 차이</p>
              <p className="font-number text-sm font-bold">{formattedGap}</p>
            </div>
          </div>
          <div
            role="progressbar"
            aria-label="바로 위 자산 대비 비트코인 시가총액"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={comparisonPercent}
            aria-valuetext={comparisonDescription}
            className="h-1.5 overflow-hidden rounded-full bg-bitcoin/10"
          >
            <div
              style={comparisonBarStyle}
              className="h-full rounded-full bg-gradient-to-r from-bitcoin/60 to-bitcoin"
            />
          </div>
          <p className="mt-2 text-[11px] text-muted-foreground">
            상위 자산 시가총액의{" "}
            <strong className="font-number font-bold text-bitcoin">
              {formattedComparisonPercent}
            </strong>
          </p>
        </div>
      )}
    </section>
  );
}
