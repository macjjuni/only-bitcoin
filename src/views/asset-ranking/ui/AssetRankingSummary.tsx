import type { AssetRankingSnapshot } from "@/entities/asset-ranking";
import { formatCollectedAt } from "../lib/formatAssetRanking";
import BitcoinRankCard from "./BitcoinRankCard";

interface AssetRankingSummaryProps {
  snapshot: AssetRankingSnapshot;
}

const PANEL_CLASS_NAME = "rounded-xl border border-border bg-background/55 glass-bg";

export default function AssetRankingSummary({ snapshot }: AssetRankingSummaryProps) {
  // region [Privates]
  const bitcoin = snapshot.assets.find(
    (asset) => asset.ticker === "BTC" && asset.name === "Bitcoin",
  );
  const hasDelayedCollection = Date.now() - Date.parse(snapshot.fetchedAt) > 2 * 60 * 60 * 1000;
  const precedingAsset = snapshot.assets.find((asset) => asset.rank === (bitcoin?.rank ?? 0) - 1);
  const formattedCollectedAt = formatCollectedAt(snapshot.fetchedAt);
  const collectionStatusLabel = hasDelayedCollection ? "수집 지연" : "마지막 수집";
  const collectionStatusClassName = hasDelayedCollection ? "bg-bitcoin" : "bg-up";
  // endregion

  return (
    <section className="flex flex-col gap-2.5">
      {bitcoin && (
        <BitcoinRankCard
          bitcoin={bitcoin}
          precedingAsset={precedingAsset}
          rankedAssetCount={snapshot.assets.length}
        />
      )}
      <p
        className={`${PANEL_CLASS_NAME} flex flex-wrap items-center justify-between gap-2 px-3.5 py-2.5 text-[11px] font-bold text-muted-foreground`}
      >
        <span className="flex items-center gap-1.5">
          <span className={`size-1.5 shrink-0 rounded-full ${collectionStatusClassName}`} />
          {collectionStatusLabel}
        </span>
        <time
          dateTime={snapshot.fetchedAt}
          className="font-number text-xs font-black text-foreground"
        >
          {formattedCollectedAt}
        </time>
      </p>
      {hasDelayedCollection && (
        <p className="px-1 text-xs leading-relaxed text-muted-foreground">
          수집이 지연되어 마지막 정상 데이터를 표시합니다.
        </p>
      )}
    </section>
  );
}
