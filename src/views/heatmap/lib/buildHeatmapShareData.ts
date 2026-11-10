import type { HeatmapShareData, HeatmapShareTone } from "@/features/heatmap-share";
import type { CoinMapTile } from "./buildCoinMapSummary";
import {
  formatCollectedAt,
  formatCompactUsd,
  formatDailyChange,
  formatSharePercent,
} from "./formatCoinMap";
import { resolveTileColor } from "./resolveTileColor";

interface BuildHeatmapShareDataParams {
  tiles: CoinMapTile[];
  totalMarketCapInUsd: number;
  /** 공식 도미넌스(%). 칸 비중과 계산 기준이 달라서 따로 받음. */
  bitcoinDominancePercent: number;
  fetchedAt: string;
}

// region [Privates]
const resolveChangeTone = (dailyChangePercent: number | null): HeatmapShareTone => {
  if (dailyChangePercent === null || dailyChangePercent === 0) {
    return "flat";
  }
  return dailyChangePercent > 0 ? "up" : "down";
};
// endregion

/**
 * 화면용 칸을 공유 카드 표시값으로 바꿈.
 * 카드는 항상 어두운 배경이라 색은 다크 기준으로 뽑음. 문구도 여기서 만들어 화면과 같은 규칙을 씀.
 */
export const buildHeatmapShareData = ({
  tiles,
  totalMarketCapInUsd,
  bitcoinDominancePercent,
  fetchedAt,
}: BuildHeatmapShareDataParams): HeatmapShareData => {
  const bitcoinTile = tiles.find((tile) => tile.kind === "bitcoin");

  return {
    tiles: tiles.map((tile) => {
      const tileColor = resolveTileColor(tile, true);
      return {
        id: tile.id,
        label: tile.label,
        valueLabel:
          tile.kind === "others"
            ? formatSharePercent(tile.sharePercent)
            : formatDailyChange(tile.dailyChangePercent),
        value: tile.marketCapInUsd,
        isBitcoin: tile.kind === "bitcoin",
        fillColor: tileColor.fill,
        textColor: tileColor.text,
      };
    }),
    bitcoinDominanceLabel: formatSharePercent(bitcoinDominancePercent),
    bitcoinMarketCapLabel: formatCompactUsd(bitcoinTile?.marketCapInUsd ?? 0),
    bitcoinChangeLabel: formatDailyChange(bitcoinTile?.dailyChangePercent ?? null),
    bitcoinChangeTone: resolveChangeTone(bitcoinTile?.dailyChangePercent ?? null),
    totalMarketCapLabel: formatCompactUsd(totalMarketCapInUsd),
    collectedAtLabel: formatCollectedAt(fetchedAt),
  };
};
