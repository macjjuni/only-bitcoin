"use client";

import { useState } from "react";
import type { RankedAsset } from "@/entities/asset-ranking";
import { formatAssetPrice, formatDailyChange, formatMarketCap } from "../lib/formatAssetRanking";

interface AssetRankingRowProps {
  asset: RankedAsset;
}

export default function AssetRankingRow({ asset }: AssetRankingRowProps) {
  // region [Hooks]
  const [hasLogoFailed, setHasLogoFailed] = useState(false);
  // endregion

  // region [Privates]
  const isBitcoin = asset.ticker === "BTC" && asset.name === "Bitcoin";
  const shouldShowLogo = Boolean(asset.logoUrl) && !hasLogoFailed;
  const changeColorClassName =
    asset.dailyChangePercent === null || asset.dailyChangePercent === 0
      ? "text-muted-foreground"
      : asset.dailyChangePercent > 0
        ? "text-up"
        : "text-down";
  const rowClassName = isBitcoin ? "bg-bitcoin/10" : "";
  const logoFallback = asset.ticker.slice(0, 1);
  const formattedMarketCap = formatMarketCap(asset.marketCapInUsd);
  const formattedFullMarketCap = formatAssetPrice(asset.marketCapInUsd);
  const formattedPrice = formatAssetPrice(asset.priceInUsd);
  const formattedDailyChange = formatDailyChange(asset.dailyChangePercent);
  // endregion

  // region [Events]
  const onErrorAssetLogo = () => {
    setHasLogoFailed(true);
  };
  // endregion

  return (
    <tr className={`border-b border-border last:border-0 ${rowClassName}`}>
      <td className="font-number py-3 pl-3 pr-1 align-top text-sm text-muted-foreground">
        {asset.rank}
      </td>
      <th scope="row" className="px-2 py-3 text-left align-top font-normal">
        <div className="flex items-start gap-2">
          <span className="flex size-7 shrink-0 items-center justify-center rounded-md bg-white p-1 font-number text-xs font-bold text-neutral-700">
            {shouldShowLogo ? (
              // biome-ignore lint/performance/noImgElement: 원본의 작은 로고를 지연 로딩하며 실패 시 티커로 대체한다.
              <img
                src={asset.logoUrl ?? undefined}
                alt=""
                width={20}
                height={20}
                loading="lazy"
                referrerPolicy="no-referrer"
                onError={onErrorAssetLogo}
                className="size-5 object-contain"
              />
            ) : (
              logoFallback
            )}
          </span>
          <div className="min-w-0 flex-1">
            <span className="block [overflow-wrap:anywhere] text-sm font-bold leading-snug">
              {asset.name}
            </span>
            <span
              className="font-number mt-0.5 block [overflow-wrap:anywhere] text-xs text-muted-foreground"
              title={asset.country ?? undefined}
            >
              {asset.ticker}
            </span>
            <span className="font-number mt-0.5 block text-xs text-muted-foreground min-[480px]:hidden">
              가격 {formattedPrice}
            </span>
          </div>
        </div>
      </th>
      <td className="font-number hidden whitespace-nowrap px-2 py-3 text-right align-top text-sm min-[480px]:table-cell">
        {formattedPrice}
      </td>
      <td className="font-number whitespace-nowrap py-3 pl-2 pr-3 text-right align-top">
        <strong className="block text-sm font-bold" title={formattedFullMarketCap}>
          {formattedMarketCap}
        </strong>
        <span className={`mt-0.5 block text-xs font-bold ${changeColorClassName}`}>
          <span className="sr-only">당일 등락 </span>
          {formattedDailyChange}
        </span>
      </td>
    </tr>
  );
}
