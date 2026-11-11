import type { ApexOptions } from "apexcharts";
import type { CoinMapTile } from "@/entities/coin-market";
import {
  formatCompactUsd,
  formatDailyChange,
  formatSharePercent,
  resolveTileColor,
} from "@/entities/coin-market";

// region [Privates]
const escapeHtml = (value: string): string => {
  return value.replace(/[&<>"']/g, (character) => `&#${character.charCodeAt(0)};`);
};
// endregion

/**
 * 트리맵 옵션. 칸 색은 시리즈 데이터의 fillColor 로 넣고 여기선 글자색만 맞춤.
 * @param onRendered 그리기가 끝날 때마다 호출. 라벨 재배치 용도.
 */
export const createCoinTreemapOptions = (
  tiles: CoinMapTile[],
  isDark: boolean,
  onRendered: () => void,
): ApexOptions => {
  return {
    chart: {
      type: "treemap",
      toolbar: { show: false },
      animations: { enabled: false },
      fontFamily: "inherit",
      background: "transparent",
      parentHeightOffset: 0,
      events: { mounted: onRendered, updated: onRendered },
    },
    legend: { show: false },
    // 트리맵인데도 x축 눈금이 차트 아래 찍혀서 축을 통째로 끔.
    xaxis: { labels: { show: false }, axisTicks: { show: false }, axisBorder: { show: false } },
    yaxis: { show: false },
    // 트리맵도 그리드 위쪽 여백을 20px 잡아서 카드 위가 비어 보임. 위는 당기고,
    // 그만큼 아래로 5px 넘쳐서 bottom 으로 되돌림. 실측값임.
    grid: { padding: { top: -20, right: 0, bottom: 5, left: 0 } },
    plotOptions: {
      treemap: {
        distributed: true,
        enableShades: false,
        useFillColorAsStroke: false,
        borderRadius: 4,
        dataLabels: { format: "truncate" },
      },
    },
    stroke: { width: 2, colors: [isDark ? "#09090B" : "#FFFFFF"] },
    dataLabels: {
      enabled: true,
      style: {
        fontSize: "12px",
        fontWeight: 700,
        colors: tiles.map((tile) => resolveTileColor(tile, isDark).text),
      },
      formatter: (_text, options) => {
        const tile = tiles[options.dataPointIndex];
        if (!tile) {
          return "";
        }
        const valueLabel =
          tile.kind === "others"
            ? formatSharePercent(tile.sharePercent)
            : formatDailyChange(tile.dailyChangePercent);
        return [tile.label, valueLabel];
      },
    },
    states: {
      hover: { filter: { type: "none" } },
      active: { filter: { type: "none" } },
    },
    tooltip: {
      theme: isDark ? "dark" : "light",
      custom: ({ dataPointIndex }) => {
        const tile = tiles[dataPointIndex];
        if (!tile) {
          return "";
        }
        const rankLabel = tile.rank ? `${tile.rank}위 · ` : "";
        const changeLine =
          tile.kind === "others"
            ? ""
            : `<div>24시간 ${formatDailyChange(tile.dailyChangePercent)}</div>`;
        return `<div style="padding:8px 10px;font-size:12px;line-height:1.5">
  <strong>${escapeHtml(tile.name)}</strong>
  <div>${rankLabel}${formatCompactUsd(tile.marketCapInUsd)}</div>
  <div>전체의 ${formatSharePercent(tile.sharePercent)}</div>
  ${changeLine}
</div>`;
      },
    },
  };
};
