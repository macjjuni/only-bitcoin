import {
  buildCoinMapSummary,
  type CoinMapTile,
  type CoinMarketSnapshot,
  formatDailyChange,
  formatSharePercent,
  resolveTileColor,
} from "@/entities/coin-market";
import { squarifyTreemap, type TreemapRect } from "@/shared/lib/treemap";
import { NUMERIC_FONT_STACK, SANS_FONT_STACK } from "./screenCanvas";

/** 벽난로 화면(13 × 6.5 m)과 같은 2:1. 원본 차트를 늘리지 않고 칸을 재배치함. */
export const HEATMAP_TEXTURE = { width: 2048, height: 1024 } as const;

const TILE_GAP = 4;
const BACKDROP_COLOR = "#09090b";

export interface HeatmapTextureState {
  snapshot?: CoinMarketSnapshot;
  hasError: boolean;
}

// region [Privates]
/** 큰 칸은 두 줄, 좁은 칸은 회전·티커만 표시. 최소 글씨도 안 들어가면 생략함. */
const drawTileLabel = (
  context: CanvasRenderingContext2D,
  tile: CoinMapTile,
  rect: TreemapRect,
): void => {
  const valueLabel =
    tile.kind === "others"
      ? formatSharePercent(tile.sharePercent)
      : formatDailyChange(tile.dailyChangePercent);
  const maxFontSize = tile.kind === "bitcoin" ? 112 : 58;

  context.save();
  context.translate(rect.x + rect.width / 2, rect.y + rect.height / 2);
  context.textAlign = "center";
  context.textBaseline = "middle";

  for (const isRotated of [false, true]) {
    const availableWidth = (isRotated ? rect.height : rect.width) - 24;
    const availableHeight = (isRotated ? rect.width : rect.height) - 24;
    for (let fontSize = maxFontSize; fontSize >= 24; fontSize -= 2) {
      context.font = `700 ${fontSize}px ${SANS_FONT_STACK}`;
      const tickerWidth = context.measureText(tile.label).width;
      context.font = `700 ${Math.round(fontSize * 0.68)}px ${NUMERIC_FONT_STACK}`;
      const valueWidth = context.measureText(valueLabel).width;
      if (Math.max(tickerWidth, valueWidth) > availableWidth || fontSize * 2.1 > availableHeight) {
        continue;
      }
      if (isRotated) {
        context.rotate(-Math.PI / 2);
      }
      context.font = `700 ${fontSize}px ${SANS_FONT_STACK}`;
      context.fillText(tile.label, 0, -fontSize * 0.43);
      context.font = `700 ${Math.round(fontSize * 0.68)}px ${NUMERIC_FONT_STACK}`;
      context.fillText(valueLabel, 0, fontSize * 0.6);
      context.restore();
      return;
    }
  }

  context.font = `700 24px ${SANS_FONT_STACK}`;
  if (rect.width >= context.measureText(tile.label).width + 20 && rect.height >= 44) {
    context.fillText(tile.label, 0, 0);
  }
  context.restore();
};

const drawHeatmapTiles = (
  context: CanvasRenderingContext2D,
  snapshot: CoinMarketSnapshot,
): void => {
  const { tiles } = buildCoinMapSummary(snapshot);
  // 간격만큼 크게 배치한 뒤 각 칸의 오른쪽·아래를 줄여 바깥 여백 없이 칸 사이만 띄움.
  const rectangles = squarifyTreemap(
    tiles.map((tile) => tile.marketCapInUsd),
    HEATMAP_TEXTURE.width + TILE_GAP,
    HEATMAP_TEXTURE.height + TILE_GAP,
  );

  tiles.forEach((tile, index) => {
    const rectangle = rectangles[index];
    if (rectangle.width <= TILE_GAP || rectangle.height <= TILE_GAP) {
      return;
    }
    const tileBounds = {
      x: rectangle.x,
      y: rectangle.y,
      width: rectangle.width - TILE_GAP,
      height: rectangle.height - TILE_GAP,
    };
    const colors = resolveTileColor(tile, true);
    context.fillStyle = colors.fill;
    context.fillRect(tileBounds.x, tileBounds.y, tileBounds.width, tileBounds.height);
    context.save();
    context.beginPath();
    context.rect(tileBounds.x, tileBounds.y, tileBounds.width, tileBounds.height);
    context.clip();
    context.fillStyle = colors.text;
    drawTileLabel(context, tile, tileBounds);
    context.restore();
  });
};
// endregion

/** 데이터나 상태가 바뀔 때만 호출. 프레임마다 캔버스를 GPU에 올리지 않음. */
export const drawHeatmap = (
  context: CanvasRenderingContext2D,
  { snapshot, hasError }: HeatmapTextureState,
): void => {
  context.save();
  context.fillStyle = BACKDROP_COLOR;
  context.fillRect(0, 0, HEATMAP_TEXTURE.width, HEATMAP_TEXTURE.height);
  context.textBaseline = "middle";

  if (!snapshot || snapshot.hasFetchFailed) {
    context.textAlign = "center";
    context.fillStyle = "#a1a1aa";
    context.font = `500 42px ${SANS_FONT_STACK}`;
    context.fillText(
      hasError
        ? "데이터를 불러오지 못했습니다 · 잠시 후 재시도합니다"
        : "히트맵을 불러오는 중입니다",
      HEATMAP_TEXTURE.width / 2,
      HEATMAP_TEXTURE.height / 2,
    );
    context.restore();
    return;
  }

  drawHeatmapTiles(context, snapshot);
  context.restore();
};
