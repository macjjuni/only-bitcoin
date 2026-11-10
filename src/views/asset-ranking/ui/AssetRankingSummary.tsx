import { type AssetRankingSnapshot, isBitcoinAsset } from "@/entities/asset-ranking";
import { UpdatedAtBar } from "@/shared/ui";
import BitcoinRankCard from "./BitcoinRankCard";

interface AssetRankingSummaryProps {
  snapshot: AssetRankingSnapshot;
}

export default function AssetRankingSummary({ snapshot }: AssetRankingSummaryProps) {
  // region [Privates]
  const bitcoin = snapshot.assets.find(isBitcoinAsset);
  const hasDelayedCollection = Date.now() - Date.parse(snapshot.fetchedAt) > 2 * 60 * 60 * 1000;
  const precedingAsset = snapshot.assets.find((asset) => asset.rank === (bitcoin?.rank ?? 0) - 1);
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
      <UpdatedAtBar updatedAt={snapshot.fetchedAt} isDelayed={hasDelayedCollection} />
      {hasDelayedCollection && (
        <p className="px-1 text-xs leading-relaxed text-muted-foreground">
          업데이트가 지연되어 마지막 정상 데이터를 표시합니다.
        </p>
      )}
    </section>
  );
}
