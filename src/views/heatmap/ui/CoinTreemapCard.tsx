"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useRef } from "react";
import useSettingStore from "@/shared/stores/settingStore";
import { Card, CardContent } from "@/shared/ui";
import type { CoinMapTile } from "../lib/buildCoinMapSummary";
import {
  CHANGE_COLOR_STOPS,
  resolveNeutralTileFill,
  resolveTileColor,
} from "../lib/resolveTileColor";
import { createCoinTreemapOptions } from "./createCoinTreemapOptions";

const ReactApexChart = dynamic(() => import("react-apexcharts"), { ssr: false });

interface CoinTreemapCardProps {
  tiles: CoinMapTile[];
  topCount: number;
}

/** 라벨 둘레 최소 여백. 이보다 빠듯하면 라벨을 숨김. */
const TILE_LABEL_PADDING = 6;
/** 비트코인 칸이 이보다 작으면 큰 글씨 없이 다른 칸처럼 그림. */
const BITCOIN_EMPHASIS_MIN_TILE_SIZE = 110;
/** 비트코인 칸 라벨 크기. 차트 옵션은 칸마다 글자 크기를 못 줘서 그린 뒤 키움. */
const BITCOIN_TICKER_FONT_SIZE = 24;
const BITCOIN_CHANGE_FONT_SIZE = 15;
/** 티커 줄과 등락률 줄 사이 간격( 등락률 줄의 dy ). */
const BITCOIN_LABEL_LINE_GAP = 22;
/** ApexCharts 리사이즈 디바운스보다 길게 기다렸다 라벨을 다시 맞춤. */
const RESIZE_SETTLE_DELAY_MS = 350;

// region [Privates]
/** 비트코인 칸을 큰 글씨로 그릴 만큼 큰지. */
const canEmphasizeBitcoinTile = (tileRect: SVGRectElement): boolean => {
  return (
    Math.min(tileRect.width.baseVal.value, tileRect.height.baseVal.value) >=
    BITCOIN_EMPHASIS_MIN_TILE_SIZE
  );
};

/** 범례 막대. 가운데는 중립색, 양 끝은 ±10% 이상 원색. */
const createLegendGradient = (neutralFill: string): string => {
  return `linear-gradient(to right, ${CHANGE_COLOR_STOPS.down}, ${neutralFill}, ${CHANGE_COLOR_STOPS.up})`;
};

/**
 * 그린 뒤 한 칸의 라벨을 다시 배치함.
 * - ApexCharts 는 두 줄 라벨의 첫 줄을 칸 중앙에 두고 아래로 쌓아서 덩어리가 아래로 쏠림.
 *   라벨 박스 중심을 칸 중심으로 옮김.
 * - 가로로 안 들어가면 세로로 돌리고, 그래도 안 들어가면 숨김. 툴팁·목록에서 볼 수 있음.
 *   ApexCharts 자체 회전은 다시 그릴 때마다 들쭉날쭉해서 지우고 직접 판단함.
 * - 강조 칸( 비트코인 )은 글씨를 키움. 크기를 잰 뒤에 키우면 가운데가 틀어져서 먼저 함.
 *
 * 같은 DOM 에 여러 번 불려도 결과가 같아야 해서 잴 때마다 숨김·변형을 먼저 풂.
 * 숨긴 채로 재면 브라우저에 따라 크기가 0 으로 나오거나 예외가 남.
 */
const fitTileLabel = (tileRect: SVGRectElement, isEmphasized: boolean): void => {
  const labelGroup = tileRect.nextElementSibling;
  const labelText = labelGroup?.querySelector("text");
  if (!(labelGroup instanceof SVGGElement) || !labelText) {
    return;
  }

  labelGroup.style.display = "";
  labelGroup.removeAttribute("transform");
  labelText.removeAttribute("transform");

  const [tickerLine, changeLine] = labelText.querySelectorAll("tspan");
  if (isEmphasized && tickerLine && changeLine) {
    tickerLine.style.fontSize = `${BITCOIN_TICKER_FONT_SIZE}px`;
    changeLine.style.fontSize = `${BITCOIN_CHANGE_FONT_SIZE}px`;
    changeLine.setAttribute("dy", String(BITCOIN_LABEL_LINE_GAP));
  }

  const labelBox = labelText.getBBox();
  const tileWidth = tileRect.width.baseVal.value;
  const tileHeight = tileRect.height.baseVal.value;
  const paddedLabelWidth = labelBox.width + TILE_LABEL_PADDING * 2;
  const paddedLabelHeight = labelBox.height + TILE_LABEL_PADDING * 2;
  const fitsHorizontally = paddedLabelWidth <= tileWidth && paddedLabelHeight <= tileHeight;
  const fitsVertically = paddedLabelHeight <= tileWidth && paddedLabelWidth <= tileHeight;

  if (!fitsHorizontally && !fitsVertically) {
    labelGroup.style.display = "none";
    return;
  }

  const tileCenterX = tileRect.x.baseVal.value + tileWidth / 2;
  const tileCenterY = tileRect.y.baseVal.value + tileHeight / 2;
  const translateX = tileCenterX - (labelBox.x + labelBox.width / 2);
  const translateY = tileCenterY - (labelBox.y + labelBox.height / 2);
  const centerTransform = `translate(${translateX} ${translateY})`;

  // SVG transform 은 오른쪽부터 적용됨. 가운데로 옮긴 뒤 그 자리에서 돌림.
  labelText.setAttribute(
    "transform",
    fitsHorizontally
      ? centerTransform
      : `rotate(-90 ${tileCenterX} ${tileCenterY}) ${centerTransform}`,
  );
};
// endregion

/** 면적 = 시총 비중, 색 = 24시간 등락률. */
export default function CoinTreemapCard({ tiles, topCount }: CoinTreemapCardProps) {
  // region [Hooks]
  const isDark = useSettingStore((store) => store.theme) === "dark";
  const chartWrapperRef = useRef<HTMLDivElement>(null);
  const bitcoinTileIndex = useMemo(
    () => tiles.findIndex((tile) => tile.kind === "bitcoin"),
    [tiles],
  );

  /** 모든 칸의 라벨을 다시 맞춤. rect 의 `j` 가 데이터 순번이고, 바로 다음 형제가 라벨 그룹임. */
  const fitTileLabels = useCallback(() => {
    const tileRects = chartWrapperRef.current?.querySelectorAll<SVGRectElement>(
      "rect.apexcharts-treemap-rect",
    );
    tileRects?.forEach((tileRect) => {
      const isBitcoinTile = tileRect.getAttribute("j") === String(bitcoinTileIndex);
      fitTileLabel(tileRect, isBitcoinTile && canEmphasizeBitcoinTile(tileRect));
    });
  }, [bitcoinTileIndex]);

  const chartOptions = useMemo(
    () => createCoinTreemapOptions(tiles, isDark, fitTileLabels),
    [tiles, isDark, fitTileLabels],
  );
  const chartSeries = useMemo(() => {
    return [
      {
        data: tiles.map((tile) => ({
          x: tile.label,
          y: tile.marketCapInUsd,
          fillColor: resolveTileColor(tile, isDark).fill,
        })),
      },
    ];
  }, [tiles, isDark]);
  // endregion

  // region [Privates]
  const neutralFill = resolveNeutralTileFill(isDark);
  const legendGradientStyle = { backgroundImage: createLegendGradient(neutralFill) };
  const neutralSwatchStyle = { backgroundColor: neutralFill };
  // endregion

  // region [Life Cycles]
  /**
   * 크기가 바뀌면 ApexCharts 가 차트를 새로 그리는데 그때는 `updated` 가 안 올 수 있어서
   * 그리기가 끝날 만큼 기다렸다가 라벨을 한 번 더 맞춤.
   */
  useEffect(() => {
    const chartWrapper = chartWrapperRef.current;
    if (!chartWrapper) {
      return undefined;
    }

    let settleTimer: ReturnType<typeof setTimeout> | undefined;
    const resizeObserver = new ResizeObserver(() => {
      clearTimeout(settleTimer);
      settleTimer = setTimeout(fitTileLabels, RESIZE_SETTLE_DELAY_MS);
    });
    resizeObserver.observe(chartWrapper);

    return () => {
      clearTimeout(settleTimer);
      resizeObserver.disconnect();
    };
  }, [fitTileLabels]);
  // endregion

  return (
    <Card>
      <CardContent className="flex flex-col gap-3 p-4">
        <div
          ref={chartWrapperRef}
          role="img"
          aria-label={`상위 ${topCount}개 코인과 기타의 시가총액 비중과 24시간 등락률 트리맵`}
          className="relative -mx-1 aspect-square select-none"
        >
          <ReactApexChart
            type="treemap"
            options={chartOptions}
            series={chartSeries}
            width="100%"
            height="100%"
          />
        </div>
        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 text-[11px] font-bold text-muted-foreground">
          <div className="flex items-center gap-1.5">
            <span className="font-number">-10%</span>
            <i className="h-2 w-28 rounded-full" style={legendGradientStyle} />
            <span className="font-number">+10%</span>
          </div>
          <span className="inline-flex items-center gap-1">
            <i
              className="size-2.5 shrink-0 rounded-sm border border-border"
              style={neutralSwatchStyle}
            />
            스테이블·기타
          </span>
        </div>
        <p className="text-[11px] text-muted-foreground">
          면적 = 전체 시총 대비 비중 · 색 = 24시간 등락률 · 상위 {topCount}개 + 기타
        </p>
      </CardContent>
    </Card>
  );
}
