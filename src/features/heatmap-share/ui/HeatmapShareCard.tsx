"use client";

import { KIcon } from "kku-ui";
import { memo, type RefObject, useMemo } from "react";
import { BITCOIN_COLOR } from "@/shared/config/color";
import { env, SERVICE_DOMAIN } from "@/shared/config/env";
import { BtcTextLogo, ShareCardQr } from "@/shared/ui";
import { BitcoinIcon } from "@/shared/ui/icon";
import { squarifyTreemap } from "../lib/squarifyTreemap";
import type { HeatmapShareData, HeatmapShareTile, HeatmapShareTone } from "../model/types";

export const HEATMAP_SHARE_CARD_DESIGN_WIDTH = 440;
export const SHARE_QR_CANVAS_ID = "heatmap-share-qr";

/** 카드 폭 440 에서 카드 패딩( 24 )과 히트맵 틀의 패딩( 12 ) · 테두리( 1 )를 좌우로 뺀 값. */
const TREEMAP_WIDTH = 366;
const TREEMAP_HEIGHT = 180;
/** 칸 사이 간격. 각 칸을 절반씩 안으로 줄여서 만듦. */
const TILE_GAP = 3;
/** 비트코인 칸이 이보다 작으면 큰 라벨·워터마크 없이 일반 라벨로 그림. */
const BITCOIN_TILE_MIN_SIZE = 110;

/**
 * 비트코인 칸 배경 워터마크. 칸 짧은 변 대비 크기와, 오른쪽·아래로 밀어내는 비율.
 * 고정 px 로 두면 히트맵 높이를 바꿀 때마다 잘리는 모양이 달라져서 비율로 둠.
 */
const BITCOIN_WATERMARK_SIZE_RATIO = 1.35;
const BITCOIN_WATERMARK_OFFSET_RIGHT_RATIO = 0.27;
const BITCOIN_WATERMARK_OFFSET_BOTTOM_RATIO = 0.2;

const UP_COLOR = "#22c55e";
const DOWN_COLOR = "#ef4444";
const NEUTRAL_TILE_COLOR = "#27272a";

const TONE_COLOR: Record<HeatmapShareTone, string> = {
  up: UP_COLOR,
  down: DOWN_COLOR,
  flat: "rgba(255,255,255,0.6)",
};

/** 카드 테두리·배경 빛 번짐 색( r,g,b ). 비트코인 등락 방향을 따르고 보합이면 주황. */
const TONE_GLOW_RGB: Record<HeatmapShareTone, string> = {
  up: "34,197,94",
  down: "239,68,68",
  flat: "247,147,26",
};

/**
 * 배경. 오른쪽 위 모서리에서 빛과 동심원 파동이 퍼져 나감. 색은 비트코인 등락 색.
 * 히트맵이 네모 칸이라 격자 대신 원을 씀. 위에 적힌 층이 위에 그려짐.
 * blur · mask 는 iOS 캡처에서 깨져서 전부 그라데이션으로만 만듦.
 * 파동이 멀어질수록 옅어지는 건 바탕색으로 덮는 층( 셋째 줄 )이 맡음.
 */
const createCardBackgroundImage = (glowRgb: string): string => {
  return [
    `radial-gradient(90% 55% at 100% 0%, rgba(${glowRgb},0.30), transparent 65%)`,
    `radial-gradient(70% 45% at 0% 100%, rgba(${glowRgb},0.12), transparent 70%)`,
    "radial-gradient(circle at 100% 0%, transparent 15%, #0e0e10 72%)",
    `repeating-radial-gradient(circle at 100% 0%, transparent 0 25px, rgba(${glowRgb},0.2) 25px 26px)`,
    "linear-gradient(180deg, #131316 0%, #09090b 100%)",
  ].join(", ");
};

const LEGEND_GRADIENT = `linear-gradient(to right, ${DOWN_COLOR}, ${NEUTRAL_TILE_COLOR}, ${UP_COLOR})`;

type TileLabelVariant = "bitcoin" | "large" | "medium" | "vertical" | "ticker" | "none";

interface TileLabelStyle {
  tickerClassName: string;
  valueClassName: string;
}

const TILE_LABEL_STYLE: Record<"large" | "medium" | "vertical", TileLabelStyle> = {
  large: { tickerClassName: "text-[15px]", valueClassName: "text-[13px]" },
  medium: { tickerClassName: "text-[12px]", valueClassName: "text-[11px]" },
  vertical: { tickerClassName: "text-[11px]", valueClassName: "text-[10px]" },
};

// region [Privates]
/**
 * 글자 수로 라벨이 칸에 들어가는지 어림함.
 * 캡처용이라 그린 뒤 재서 고치는 대신 미리 정해 둠. 굵은 숫자·영문 폭을 글자 크기의 0.62 배로 봄.
 */
const doesLabelFit = (
  tile: HeatmapShareTile,
  fontSizeInPixels: number,
  lineCount: number,
  availableWidth: number,
  availableHeight: number,
): boolean => {
  const longestLineLength =
    lineCount === 1 ? tile.label.length : Math.max(tile.label.length, tile.valueLabel.length);
  const labelWidth = longestLineLength * fontSizeInPixels * 0.62 + 10;
  const labelHeight = lineCount * fontSizeInPixels * 1.25 + 8;

  return labelWidth <= availableWidth && labelHeight <= availableHeight;
};

/** 칸 크기에 맞는 라벨 형태. 큰 것부터 시도하고 다 안 맞으면 비움. */
const resolveTileLabelVariant = (
  tile: HeatmapShareTile,
  width: number,
  height: number,
): TileLabelVariant => {
  if (tile.isBitcoin && Math.min(width, height) >= BITCOIN_TILE_MIN_SIZE) {
    return "bitcoin";
  }
  if (doesLabelFit(tile, 15, 2, width, height)) {
    return "large";
  }
  if (doesLabelFit(tile, 12, 2, width, height)) {
    return "medium";
  }
  if (doesLabelFit(tile, 11, 2, height, width)) {
    return "vertical";
  }
  if (doesLabelFit(tile, 10, 1, width, height)) {
    return "ticker";
  }
  return "none";
};
// endregion

export interface HeatmapShareCardProps {
  cardRef?: RefObject<HTMLDivElement | null>;
  data: HeatmapShareData;
}

interface TreemapTileProps {
  tile: HeatmapShareTile;
  left: number;
  top: number;
  width: number;
  height: number;
}

/** 트리맵 한 칸. 위치·크기는 미리 계산해서 받음. */
function TreemapTile({ tile, left, top, width, height }: TreemapTileProps) {
  // region [Privates]
  const labelVariant = resolveTileLabelVariant(tile, width, height);
  const tileStyle = {
    left,
    top,
    width,
    height,
    backgroundColor: tile.fillColor,
    color: tile.textColor,
    // 비트코인 칸만 흰 테두리. 색이 등락률 몫이라 테두리로 구분함.
    boxShadow: tile.isBitcoin ? "inset 0 0 0 2px #FFFFFF" : undefined,
  };
  const watermarkSize = Math.min(width, height) * BITCOIN_WATERMARK_SIZE_RATIO;
  const watermarkStyle = {
    right: -watermarkSize * BITCOIN_WATERMARK_OFFSET_RIGHT_RATIO,
    bottom: -watermarkSize * BITCOIN_WATERMARK_OFFSET_BOTTOM_RATIO,
  };
  // endregion

  // region [Templates]
  const renderLabel = () => {
    if (labelVariant === "none") {
      return null;
    }
    if (labelVariant === "bitcoin") {
      return (
        <div className="relative flex flex-col items-center gap-2 font-number font-black leading-none">
          <span className="text-[30px] tracking-tight">{tile.label}</span>
          <span className="text-[20px]">{tile.valueLabel}</span>
        </div>
      );
    }
    if (labelVariant === "ticker") {
      return <span className="font-number text-[10px] font-bold leading-none">{tile.label}</span>;
    }

    const labelStyle = TILE_LABEL_STYLE[labelVariant];
    return (
      <div
        className={`flex flex-col items-center gap-[3px] whitespace-nowrap font-number font-bold leading-none ${
          labelVariant === "vertical" ? "-rotate-90" : ""
        }`}
      >
        <span className={labelStyle.tickerClassName}>{tile.label}</span>
        <span className={labelStyle.valueClassName}>{tile.valueLabel}</span>
      </div>
    );
  };
  // endregion

  return (
    <div
      style={tileStyle}
      className="absolute flex items-center justify-center overflow-hidden rounded-md"
    >
      {/* 자산 랭킹 카드처럼 큰 아이콘을 흐리게 깖. 아이콘 자체가 기울어 있어서 회전은 안 줌. 칸 색이 등락률이라 주황 대신 흰색을 씀. */}
      {labelVariant === "bitcoin" && (
        <BitcoinIcon
          size={watermarkSize}
          color="#FFFFFF"
          style={watermarkStyle}
          className="pointer-events-none absolute opacity-[0.09]"
        />
      )}
      {renderLabel()}
    </div>
  );
}

function HeatmapShareCard({ cardRef, data }: HeatmapShareCardProps) {
  // region [Hooks]
  const tileRects = useMemo(() => {
    return squarifyTreemap(
      data.tiles.map((tile) => tile.value),
      TREEMAP_WIDTH,
      TREEMAP_HEIGHT,
    );
  }, [data.tiles]);
  // endregion

  // region [Privates]
  const shareUrl = new URL("/heatmap", env.NEXT_PUBLIC_URL).toString();
  const changeToneColor = TONE_COLOR[data.bitcoinChangeTone];
  const glowRgb = TONE_GLOW_RGB[data.bitcoinChangeTone];
  const cardStyle = {
    backgroundImage: createCardBackgroundImage(glowRgb),
    borderColor: `rgba(${glowRgb},0.35)`,
  };
  const treemapStyle = { width: TREEMAP_WIDTH, height: TREEMAP_HEIGHT };
  // 숫자·단위 다 흰색. 등락 색 테두리·히트맵과 색이 안 겹치게 함.
  // 번짐은 text-shadow 로 줌. filter 는 iOS 캡처에서 글리프가 잘림.
  const heroDominanceNumber = data.bitcoinDominanceLabel.replace(/%$/, "");
  const heroDominanceStyle = { textShadow: "0 0 26px rgba(255,255,255,0.45)" };
  const changeToneStyle = { color: changeToneColor };
  const legendGradientStyle = { backgroundImage: LEGEND_GRADIENT };
  const neutralSwatchStyle = { backgroundColor: NEUTRAL_TILE_COLOR };
  const domainStyle = { textShadow: `0 0 14px ${BITCOIN_COLOR}80` };
  const domainDotStyle = { backgroundColor: BITCOIN_COLOR };
  // endregion

  return (
    <div
      ref={cardRef}
      style={cardStyle}
      className="font-pretendard relative w-[440px] select-none overflow-hidden rounded-[32px] border bg-[#09090b]"
    >
      <div className="relative flex flex-col p-6 text-white">
        {/* 다른 공유 카드와 같은 헤더 규격. QR 이 로고보다 커서 위 맞춤 씀. */}
        <div className="mb-4 flex min-h-[52px] items-start gap-2">
          <div className="flex items-center gap-2">
            <div className="flex items-center justify-center rounded-full bg-white p-[1px]">
              <KIcon icon="bitcoin" color={BITCOIN_COLOR} size={36} />
            </div>
            <BtcTextLogo color="#fff" height={36} width={156} />
          </div>
          <ShareCardQr className="ml-auto" id={SHARE_QR_CANVAS_ID} value={shareUrl} />
        </div>

        {/*
          히트맵과 범례를 한 틀로 묶음. 프리미엄 · 아파트 카드의 비교 블록과 같은 틀임.
          트리맵은 차트 라이브러리 없이 div 로 직접 그려서 캡처가 그대로 됨.
        */}
        <div className="rounded-2xl border border-white/15 bg-black/60 p-3">
          <div className="relative" style={treemapStyle}>
            {data.tiles.map((tile, tileIndex) => {
              const rect = tileRects[tileIndex];
              const width = rect.width - TILE_GAP;
              const height = rect.height - TILE_GAP;
              if (width <= 0 || height <= 0) {
                return null;
              }

              return (
                <TreemapTile
                  key={tile.id}
                  tile={tile}
                  left={rect.x + TILE_GAP / 2}
                  top={rect.y + TILE_GAP / 2}
                  width={width}
                  height={height}
                />
              );
            })}
          </div>

          <div className="mt-3 flex items-center justify-between gap-3 text-xs font-bold text-white/60">
            <div className="flex items-center gap-2">
              <span>24시간 등락률</span>
              <span className="font-number">-10%</span>
              <i className="h-2 w-24 rounded-full" style={legendGradientStyle} />
              <span className="font-number">+10%</span>
            </div>
            <span className="flex items-center gap-1.5">
              <i
                className="size-2.5 rounded-sm border border-white/20"
                style={neutralSwatchStyle}
              />
              스테이블·기타
            </span>
          </div>
        </div>

        {/* 히어로: 비트코인 도미넌스. line box 여유는 iOS 글리프 잘림 방지용. */}
        <div className="mt-5 flex items-stretch justify-between gap-3">
          <div>
            <div className="text-base font-bold text-white/80">비트코인 도미넌스</div>
            <span
              className="font-number block text-[56px] font-black leading-[1.15] tracking-tight text-white"
              style={heroDominanceStyle}
            >
              {heroDominanceNumber}
              <span className="ml-1 text-[28px]">%</span>
            </span>
          </div>
          {/*
            왼쪽( 라벨 + 큰 숫자 ) 높이만큼 늘려 세 줄을 위아래로 벌림.
            첫 줄은 라벨과, 마지막 줄은 큰 숫자와 글자 밑선이 맞게 아래를 4px 띄움. 실측값임.
          */}
          <dl className="grid grid-cols-[auto_auto] content-between items-baseline gap-x-3 pb-1 text-right">
            <dt className="text-xs font-bold text-white/55">BTC 시총</dt>
            <dd className="font-number text-base font-black">{data.bitcoinMarketCapLabel}</dd>
            <dt className="text-xs font-bold text-white/55">전체 시총</dt>
            <dd className="font-number text-base font-black">{data.totalMarketCapLabel}</dd>
            <dt className="text-xs font-bold text-white/55">BTC 24시간</dt>
            <dd className="font-number text-base font-black" style={changeToneStyle}>
              {data.bitcoinChangeLabel}
            </dd>
          </dl>
        </div>

        <div className="mt-5 flex items-center justify-between gap-2 border-t border-white/15 pt-4">
          <span
            className="flex items-center gap-1.5 font-jetbrains text-sm font-bold uppercase tracking-wider text-white"
            style={domainStyle}
          >
            <span className="h-1.5 w-1.5 rounded-full" style={domainDotStyle} />
            {SERVICE_DOMAIN}
          </span>
          <span className="font-number min-w-0 truncate text-sm text-white/60">
            {data.collectedAtLabel}
          </span>
        </div>
      </div>
    </div>
  );
}

const MemoizedHeatmapShareCard = memo(HeatmapShareCard);
MemoizedHeatmapShareCard.displayName = "HeatmapShareCard";

export default MemoizedHeatmapShareCard;
