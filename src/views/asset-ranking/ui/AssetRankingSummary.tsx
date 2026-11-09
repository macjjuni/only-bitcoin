import type { AssetRankingSnapshot } from "@/entities/asset-ranking";
import { formatAssetPrice, formatCollectedAt, formatMarketCap } from "../lib/formatAssetRanking";

interface AssetRankingSummaryProps {
  snapshot: AssetRankingSnapshot;
}

export default function AssetRankingSummary({ snapshot }: AssetRankingSummaryProps) {
  // region [Privates]
  const bitcoin = snapshot.assets.find(
    (asset) => asset.ticker === "BTC" && asset.name === "Bitcoin",
  );
  const hasDelayedCollection = Date.now() - Date.parse(snapshot.fetchedAt) > 2 * 60 * 60 * 1000;
  const formattedMarketCap = bitcoin ? formatMarketCap(bitcoin.marketCapInUsd) : "—";
  const formattedPrice = bitcoin ? formatAssetPrice(bitcoin.priceInUsd) : "—";
  const formattedCollectedAt = formatCollectedAt(snapshot.fetchedAt);
  // endregion

  return (
    <section className="-mx-2 -mt-2.5 flex flex-col gap-4 px-5 pb-5 pt-4">
      <div>
        <p className="mb-1.5 text-[11px] font-black uppercase tracking-[0.22em] text-bitcoin">
          Global Asset Ranking
        </p>
        <h1 className="text-xl font-bold tracking-tight">전 세계 자산 랭킹</h1>
        <p className="mt-1 text-xs text-muted-foreground">
          기업·귀금속·암호화폐·ETF의 시가총액 상위 100개
        </p>
      </div>
      {bitcoin && (
        <div className="rounded-xl border border-bitcoin/25 bg-bitcoin/5 p-4">
          <div className="mb-4 flex items-center justify-between">
            <span className="text-sm font-bold">비트코인의 현재 위치</span>
            <span className="font-number text-xs font-bold text-bitcoin">BTC</span>
          </div>
          <div className="flex items-end justify-between gap-3">
            <strong className="font-number text-5xl font-black tracking-tight text-bitcoin">
              {bitcoin.rank}
              <span className="ml-1 text-lg">위</span>
            </strong>
            <dl className="text-right">
              <dt className="text-[11px] text-muted-foreground">시가총액</dt>
              <dd className="font-number text-xl font-black">{formattedMarketCap}</dd>
              <dd className="font-number mt-1 text-xs text-muted-foreground">
                가격 {formattedPrice}
              </dd>
            </dl>
          </div>
        </div>
      )}
      <p className="flex flex-wrap justify-between gap-1 text-[11px] text-muted-foreground">
        <span>
          {hasDelayedCollection ? "수집이 지연되어 마지막 정상 데이터를 표시합니다" : "마지막 수집"}
        </span>
        <time dateTime={snapshot.fetchedAt} className="font-number">
          {formattedCollectedAt}
        </time>
      </p>
    </section>
  );
}
