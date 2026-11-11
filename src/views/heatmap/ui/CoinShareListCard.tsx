"use client";

import { ChevronDown } from "lucide-react";
import { useId, useState } from "react";
import type { CoinMapTile } from "@/entities/coin-market";
import { formatCompactUsd, formatDailyChange, formatSharePercent } from "@/entities/coin-market";
import { Card, CardContent } from "@/shared/ui";

interface CoinShareListCardProps {
  tiles: CoinMapTile[];
}

/** 접힌 상태에서 보여줄 행 수. */
const COLLAPSED_ROW_COUNT = 5;

// region [Privates]
const resolveChangeClassName = (dailyChangePercent: number | null): string => {
  if (dailyChangePercent === null || dailyChangePercent === 0) {
    return "text-muted-foreground";
  }
  return dailyChangePercent > 0 ? "text-up" : "text-down";
};
// endregion

/** 트리맵에서 작은 칸은 글자가 잘려서 같은 데이터를 목록으로도 보여줌. */
export default function CoinShareListCard({ tiles }: CoinShareListCardProps) {
  // region [Hooks]
  const [isExpanded, setIsExpanded] = useState(false);
  const tableBodyId = useId();
  // endregion

  // region [Privates]
  const hiddenRowCount = Math.max(0, tiles.length - COLLAPSED_ROW_COUNT);
  const visibleTiles = isExpanded ? tiles : tiles.slice(0, COLLAPSED_ROW_COUNT);
  // endregion

  // region [Events]
  const onClickToggleRows = () => {
    setIsExpanded((prev) => !prev);
  };
  // endregion

  return (
    <Card>
      <CardContent className="flex flex-col gap-2 p-0 pt-4">
        <h2 className="px-4 text-base font-bold">코인별 비중</h2>
        <table className="w-full table-fixed border-collapse">
          <caption className="sr-only">코인별 시가총액과 전체 대비 비중, 24시간 등락률</caption>
          <thead>
            <tr className="border-b border-border bg-foreground/5 text-xs text-muted-foreground">
              <th scope="col" className="w-9 py-2 pl-4 text-left font-medium">
                #
              </th>
              <th scope="col" className="px-2 py-2 text-left font-medium">
                코인
              </th>
              <th scope="col" className="w-[88px] px-2 py-2 text-right font-medium">
                시가총액
              </th>
              <th scope="col" className="w-[76px] py-2 pl-2 pr-4 text-right font-medium">
                비중
              </th>
            </tr>
          </thead>
          <tbody id={tableBodyId}>
            {visibleTiles.map((tile) => (
              <tr
                key={tile.id}
                className={`border-b border-border last:border-0 ${tile.kind === "bitcoin" ? "bg-bitcoin/10" : ""}`}
              >
                <td className="font-number py-2.5 pl-4 text-xs text-muted-foreground">
                  {tile.rank ?? "—"}
                </td>
                <th scope="row" className="min-w-0 px-2 py-2.5 text-left font-normal">
                  <span className="font-number block truncate text-sm font-bold">{tile.label}</span>
                  {tile.kind === "stablecoin" && (
                    <span className="block text-[11px] text-muted-foreground">스테이블</span>
                  )}
                </th>
                <td className="font-number whitespace-nowrap px-2 py-2.5 text-right text-sm">
                  {formatCompactUsd(tile.marketCapInUsd)}
                </td>
                <td className="font-number whitespace-nowrap py-2.5 pl-2 pr-4 text-right">
                  <strong className="block text-sm font-bold">
                    {formatSharePercent(tile.sharePercent)}
                  </strong>
                  {tile.kind !== "others" && (
                    <span
                      className={`block text-[11px] font-bold ${resolveChangeClassName(tile.dailyChangePercent)}`}
                    >
                      <span className="sr-only">24시간 등락 </span>
                      {formatDailyChange(tile.dailyChangePercent)}
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {hiddenRowCount > 0 && (
          <button
            type="button"
            onClick={onClickToggleRows}
            aria-expanded={isExpanded}
            aria-controls={tableBodyId}
            className="flex items-center justify-center gap-1 border-t border-border py-3 text-xs font-bold text-muted-foreground transition-opacity hover:opacity-75"
          >
            {isExpanded ? "접기" : `더보기 (${hiddenRowCount}개)`}
            <ChevronDown
              size={14}
              aria-hidden="true"
              className={`transition-transform ${isExpanded ? "rotate-180" : ""}`}
            />
          </button>
        )}
      </CardContent>
    </Card>
  );
}
