"use client";

import { KIcon } from "kku-ui";
import { memo, type RefObject, useId, useMemo } from "react";
import { BITCOIN_COLOR } from "@/shared/config/color";
import { SERVICE_DOMAIN } from "@/shared/config/env";
import { BtcTextLogo, UpdownIcon } from "@/shared/ui";
import { generateSvgCurvePath } from "../model/shareCardCurve";
import type { ShareCardTimeframe } from "../model/shareCardTimeframe";
import { useBtcSurgeShareStore } from "../model/useBtcSurgeShareStore";
import { useShareCardMetrics } from "../model/useShareCardMetrics";
import BtcSurgeTimeframeSelector from "./BtcSurgeTimeframeSelector";

/**
 * SNS 확산( 네트워크 효과 )을 위한 서비스 도메인.
 *
 * 캡처 시점에만 노출하는 방식은 `html-to-image` 에 클론 훅이 없어 DOM 토글이 필요하고,
 * 그 리렌더 대기 구간이 Safari 클립보드의 user gesture 동기 제약을 깨뜨리므로 상시 노출한다.
 */
export const BTC_SURGE_CARD_DESIGN_WIDTH = 440;
export const COIN_IMAGE_SRC = "/images/btc-3d-card.png";

/** 차트 곡선 뷰박스 ( 정사각 카드 ) */
const CHART_VIEWBOX_WIDTH = 360;
const CHART_VIEWBOX_HEIGHT = 140;

/** html-to-image 캡처 후 canvas에 직접 합성할 코인 이미지 기본 정보 */
export const COIN_OVERLAY_BASE = {
  src: COIN_IMAGE_SRC,
  size: 116,
  top: 80,
  right: 24,
  shadowBlur: 20,
} as const;

export interface BtcSurgeShareCardProps {
  cardRef?: RefObject<HTMLDivElement | null>;
}

function BtcSurgeShareCard({ cardRef }: BtcSurgeShareCardProps) {
  // region [Hooks]
  const setTimeframe = useBtcSurgeShareStore((state) => state.setTimeframe);
  const {
    timeframe,
    usdPrices,
    isChartDataReady,
    isChangePercentReady,
    isUp,
    themeColor,
    currentPriceKrw,
    currentPriceUsd,
    changeAmountKrw,
    changeAmountUsd,
    changeSign,
    changePercentText,
    currentPriceKrwText,
    currentPriceUsdText,
    changeAmountKrwText,
    changeAmountUsdText,
    chartPlaceholderMessage,
    capturedAtKst,
  } = useShareCardMetrics();

  const rawId = useId();
  const glowFilterId = `surgeGlow-${rawId.replace(/:/g, "")}`;
  const gradientId = `surgeGrad-${rawId.replace(/:/g, "")}`;

  const { linePath, areaPath, lastX, lastY } = useMemo(
    () => generateSvgCurvePath(usdPrices, CHART_VIEWBOX_WIDTH, CHART_VIEWBOX_HEIGHT),
    [usdPrices],
  );
  // endregion

  // region [Events]
  const onChangeTimeframe = (selectedTimeframe: ShareCardTimeframe) => {
    setTimeframe(selectedTimeframe);
  };
  // endregion

  // region [Templates]
  /** 변동률 자리. 시계열도 24시간 값도 없으면 수치 대신 자리표시자를 둔다. */
  const ChangePercentTemplate = useMemo(() => {
    if (!isChangePercentReady) {
      return (
        <span className="flex items-center text-5xl font-black tracking-tight font-number text-neutral-700">
          --%
        </span>
      );
    }

    return (
      <span
        className="flex items-center text-5xl font-black tracking-tight font-number"
        style={{
          color: themeColor,
          filter: isUp
            ? "drop-shadow(0 0 25px rgba(0,230,118,0.45))"
            : "drop-shadow(0 0 25px rgba(255,82,82,0.45))",
        }}
      >
        <UpdownIcon isUp={isUp} size={36} className="mr-1" />
        {isUp ? "+" : ""}
        {changePercentText}%
      </span>
    );
  }, [isChangePercentReady, isUp, themeColor, changePercentText]);
  // endregion

  return (
    <div
      ref={cardRef}
      data-theme-color={themeColor}
      className={`relative w-[440px] rounded-[32px] p-6 text-white select-none overflow-hidden border transition-all duration-300 ${
        isUp ? "border-emerald-500/30 bg-[#0a0d14]" : "border-rose-500/30 bg-[#0f0a0d]"
      }`}
      style={{
        backgroundImage: isUp
          ? `
              radial-gradient(circle at 50% 100%, rgba(0,230,118,0.18) 0%, rgba(10,13,20,0.98) 75%),
              linear-gradient(to bottom, rgba(16,24,38,0.95), rgba(10,13,20,0.98))
            `
          : `
              radial-gradient(circle at 50% 100%, rgba(255,82,82,0.18) 0%, rgba(15,10,13,0.98) 75%),
              linear-gradient(to bottom, rgba(38,16,20,0.95), rgba(15,10,13,0.98))
            `,
      }}
    >
      {/* 그리드 패턴 패브릭 오버레이 */}
      <div
        className="absolute inset-0 pointer-events-none opacity-20"
        style={{
          backgroundImage: `
              linear-gradient(to right, rgba(255,255,255,0.1) 1px, transparent 1px),
              linear-gradient(to bottom, rgba(255,255,255,0.1) 1px, transparent 1px)
            `,
          backgroundSize: "24px 24px",
        }}
      />

      {/* 상단 헤더: 브랜드 로고 + 상태 뱃지 */}
      <div className="relative z-10 flex items-center justify-between mb-5">
        <div className="flex items-center gap-2">
          <KIcon icon="bitcoin" color={BITCOIN_COLOR} size={38} />
          <BtcTextLogo color="#fff" height={36} width={156} />
        </div>

        <div className="flex items-center gap-1 bg-black/40 backdrop-blur-md p-1 rounded-full border border-white/10">
          <span
            className={`flex items-center gap-1 pl-2 pr-2.5 py-1 text-sm font-bold rounded-full ${
              isUp ? "text-[#00E676] bg-emerald-500/20" : "text-[#FF5252] bg-rose-500/20"
            }`}
          >
            <span
              className="w-1.5 h-1.5 rounded-full animate-pulse"
              style={{ backgroundColor: themeColor }}
            />
            LIVE
          </span>
          <BtcSurgeTimeframeSelector
            selectedTimeframe={timeframe}
            isUp={isUp}
            onChangeTimeframe={onChangeTimeframe}
          />
        </div>
      </div>

      {/* 수치 및 가격 강조 섹션 */}
      <div className="relative z-10 mb-0">
        <div className="flex items-baseline gap-2 mb-1">{ChangePercentTemplate}</div>

        {/* 원화 · 달러 현재가 ( 변동액은 선택 타임프레임 변동률 기준 ) */}
        <div className="flex flex-col">
          <div className="flex items-baseline justify-start gap-2">
            <span className="text-2xl font-black text-white tracking-tight font-number">
              {currentPriceKrw > 0 ? `₩${currentPriceKrwText}` : "-"}
            </span>
            <span
              className="text-sm font-bold tracking-tight font-number"
              style={{ color: themeColor }}
            >
              {changeAmountKrw !== 0 ? `${changeSign}₩${changeAmountKrwText}` : ""}
            </span>
          </div>

          <div className="flex items-baseline justify-start gap-2">
            <span className="text-2xl font-black text-white tracking-tight font-number">
              {currentPriceUsd > 0 ? (
                <>
                  <span className="px-1">$</span>
                  {currentPriceUsdText}
                </>
              ) : (
                "-"
              )}
            </span>
            <span
              className="text-sm font-bold tracking-tight font-number"
              style={{ color: themeColor }}
            >
              {changeAmountUsd !== 0 ? `${changeSign}$${changeAmountUsdText}` : ""}
            </span>
          </div>
        </div>
      </div>

      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={COIN_IMAGE_SRC}
        alt=""
        width={116}
        height={116}
        className="absolute top-20 right-6 pointer-events-none"
        style={{ filter: `drop-shadow(0 0 20px ${themeColor}80)` }}
        data-capture-ignore=""
        draggable={false}
      />

      <div className="relative z-10 w-full my-3">
        {!isChartDataReady && (
          <div className="w-full aspect-[360/140] flex items-center justify-center text-sm font-semibold text-neutral-500">
            {chartPlaceholderMessage}
          </div>
        )}

        {isChartDataReady && (
          <svg
            viewBox={`0 0 ${CHART_VIEWBOX_WIDTH} ${CHART_VIEWBOX_HEIGHT}`}
            className="w-full h-auto overflow-visible"
            aria-hidden="true"
          >
            <defs>
              <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={themeColor} stopOpacity="0.4" />
                <stop offset="100%" stopColor={themeColor} stopOpacity="0.0" />
              </linearGradient>
              <filter id={glowFilterId} x="-20%" y="-20%" width="140%" height="140%">
                <feGaussianBlur stdDeviation="3" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>

            {/* 영역 그라데이션 */}
            {areaPath && <path d={areaPath} fill={`url(#${gradientId})`} />}

            {/* 차트 곡선 */}
            {linePath && (
              <path
                d={linePath}
                fill="none"
                stroke={themeColor}
                strokeWidth="3.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                filter={`url(#${glowFilterId})`}
              />
            )}

            {/* 차트 종점 펄스 지점 */}
            {linePath && (
              <g transform={`translate(${lastX}, ${lastY})`}>
                <circle r="7" fill={themeColor} className="animate-ping opacity-75" />
                <circle r="4" fill="#FFFFFF" stroke={themeColor} strokeWidth="2" />
              </g>
            )}
          </svg>
        )}

        {/* 차트 가로축 시간 텍스트 (영문) */}
        <div className="flex justify-between items-center text-sm font-semibold text-white px-1">
          <span>{timeframe} Ago</span>
          <span>Now</span>
        </div>
      </div>

      {/* 하단 메타 정보 ( 좌측 서비스 도메인은 SNS 확산용 워터마크 ) */}
      <div className="relative z-10 flex justify-between items-center gap-2 text-sm font-medium text-neutral-200 pt-4 border-t border-white/10">
        <span
          className="flex items-center gap-1.5 font-jetbrains font-black tracking-wider text-white text-sm uppercase whitespace-nowrap flex-shrink-0"
          style={{ textShadow: `0 0 14px ${themeColor}80` }}
        >
          <span
            className="w-1.5 h-1.5 rounded-full flex-shrink-0"
            style={{ backgroundColor: themeColor }}
          />
          {SERVICE_DOMAIN}
        </span>
        <span className="text-sm font-number min-w-0 truncate">{capturedAtKst}</span>
      </div>
    </div>
  );
}

const MemoizedBtcSurgeShareCard = memo(BtcSurgeShareCard);
MemoizedBtcSurgeShareCard.displayName = "BtcSurgeShareCard";

export default MemoizedBtcSurgeShareCard;
