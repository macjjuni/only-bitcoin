"use client";

import { KIcon } from "kku-ui";
import { memo, type RefObject, useId, useMemo } from "react";
import { BITCOIN_COLOR } from "@/shared/config/color";
import { SERVICE_DOMAIN } from "@/shared/config/env";
import { BtcTextLogo, UpdownIcon } from "@/shared/ui";
import { generateSvgCurvePath } from "../model/shareCardCurve";
import type { ShareCardTimeframe } from "../model/shareCardTimeframe";
import { useBtcSurgeShareStore } from "../model/useBtcSurgeShareStore";
import { useShareCardMacro } from "../model/useShareCardMacro";
import { useShareCardMetrics } from "../model/useShareCardMetrics";
import BtcSurgeTimeframeSelector from "./BtcSurgeTimeframeSelector";

/**
 * X( 트위터 ) 업로드용 가로형 고정 캔버스. ( 약 1.9:1 )
 *
 * 정사각 카드와 달리 높이까지 고정하는 이유는, 내부 요소 높이에 따라 카드가 늘어나면
 * 업로드 결과물의 비율이 흔들려 타임라인에서 상하가 잘리기 때문이다.
 */
export const BTC_SURGE_WIDE_CARD_DESIGN_WIDTH = 880;
export const BTC_SURGE_WIDE_CARD_DESIGN_HEIGHT = 462;

/** 좌측 수치 컬럼 폭. 원화 현재가( 42px ) + 변동액이 한 줄에 들어가는 최소 폭이다. */
const INFO_COLUMN_WIDTH = 430;

/** 차트 곡선 뷰박스 ( 가로형 카드 ). 하단 매크로 지표 줄에 높이를 내준 뒤의 크기다. */
const CHART_VIEWBOX_WIDTH = 362;
const CHART_VIEWBOX_HEIGHT = 136;

export interface BtcSurgeWideShareCardProps {
  cardRef?: RefObject<HTMLDivElement | null>;
}

function BtcSurgeWideShareCard({ cardRef }: BtcSurgeWideShareCardProps) {
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
  const macroItemList = useShareCardMacro();

  const rawId = useId();
  const glowFilterId = `surgeWideGlow-${rawId.replace(/:/g, "")}`;
  const gradientId = `surgeWideGrad-${rawId.replace(/:/g, "")}`;

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
        <span className="flex items-center text-[56px] leading-none font-black tracking-tight font-number text-neutral-700">
          --%
        </span>
      );
    }

    return (
      <span
        className="flex items-center text-[56px] leading-none font-black tracking-tight font-number"
        style={{
          color: themeColor,
          filter: isUp
            ? "drop-shadow(0 0 30px rgba(0,230,118,0.45))"
            : "drop-shadow(0 0 30px rgba(255,82,82,0.45))",
        }}
      >
        <UpdownIcon isUp={isUp} size={42} className="mr-1.5" />
        {isUp ? "+" : ""}
        {changePercentText}%
      </span>
    );
  }, [isChangePercentReady, isUp, themeColor, changePercentText]);

  /**
   * 원화 · 달러 현재가 두 줄.
   *
   * `font-number` 는 고정폭인 Roboto Mono 인데 `₩`( U+20A9 )가 이 폰트에 없어 폴백 폰트로 그려진다.
   * 그래서 `$` 는 모노 advance( 0.6em )를, `₩` 는 그보다 넓은 폭을 차지해 두 줄의 숫자
   * 시작점이 어긋난다. 더 넓은 `₩` 를 기준으로 칸을 잡고, 좁은 `$` 는 그 칸 안에서 가운데 정렬한다.
   *
   * 폭을 px 로 박지 않는 이유는 `₩` 를 그리는 폴백 폰트가 OS 마다 달라 실제 글리프 폭이
   * 플랫폼별로 다르기 때문이다. 보이지 않는 `₩` 를 깔아 폭을 스스로 재게 한다.
   */
  const PriceRowListTemplate = useMemo(() => {
    const priceRowList = [
      {
        id: "krw",
        currencySymbol: "₩",
        symbolClassName: "",
        hasPrice: currentPriceKrw > 0,
        priceText: currentPriceKrwText,
        changeText: changeAmountKrw !== 0 ? `${changeSign}₩${changeAmountKrwText}` : "",
      },
      {
        id: "usd",
        currencySymbol: "$",
        // `$` 가 `₩` 보다 좁아 가운데 정렬만으로는 숫자 쪽에 붙어 보인다. 살짝 왼쪽으로 민다.
        symbolClassName: "mr-[2px]",
        hasPrice: currentPriceUsd > 0,
        priceText: currentPriceUsdText,
        changeText: changeAmountUsd !== 0 ? `${changeSign}$${changeAmountUsdText}` : "",
      },
    ];

    return priceRowList.map(
      ({ id, currencySymbol, symbolClassName, hasPrice, priceText, changeText }) => (
        <div key={id} className="flex items-baseline justify-start gap-2.5 h-11">
          <span className="text-[42px] leading-none font-black text-white tracking-tight font-number">
            {hasPrice ? (
              <>
                <span className="relative inline-block">
                  <span aria-hidden="true" className="invisible">
                    ₩
                  </span>
                  <span className={`absolute inset-x-0 top-0 text-center ${symbolClassName}`}>
                    {currencySymbol}
                  </span>
                </span>
                {priceText}
              </>
            ) : (
              "-"
            )}
          </span>
          <span
            className="text-[18px] font-bold tracking-tight font-number mb-[3px]"
            style={{ color: themeColor }}
          >
            {changeText}
          </span>
        </div>
      ),
    );
  }, [
    currentPriceKrw,
    currentPriceUsd,
    currentPriceKrwText,
    currentPriceUsdText,
    changeAmountKrw,
    changeAmountUsd,
    changeAmountKrwText,
    changeAmountUsdText,
    changeSign,
    themeColor,
  ]);

  /** 하단 매크로 지표 줄. 값이 아직 없으면 단위를 숨겨 `-` 만 남긴다. */
  const MacroItemListTemplate = useMemo(
    () =>
      macroItemList.map(({ id, label, valueText, sign }) => (
        <div key={id} className="flex flex-col gap-0.5 min-w-0">
          <span className="text-lg text-neutral-300 tracking-tight truncate">{label}</span>
          <span className="text-4xl font-black text-white tracking-tight font-number truncate">
            {valueText}
            {sign && valueText !== "-" && (
              <span className="text-xl font-bold ml-0.5 text-neutral-300">{sign}</span>
            )}
          </span>
        </div>
      )),
    [macroItemList],
  );

  // endregion

  return (
    <div
      ref={cardRef}
      data-theme-color={themeColor}
      className={`relative flex flex-col w-[880px] h-[462px] rounded-[40px] p-8 text-white select-none overflow-hidden border transition-all duration-300 ${
        isUp ? "border-emerald-500/30 bg-[#0a0d14]" : "border-rose-500/30 bg-[#0f0a0d]"
      }`}
      style={{
        backgroundImage: isUp
          ? `
              radial-gradient(ellipse 70% 90% at 68% 115%, rgba(0,230,118,0.20) 0%, rgba(10,13,20,0.98) 72%),
              linear-gradient(to bottom, rgba(16,24,38,0.95), rgba(10,13,20,0.98))
            `
          : `
              radial-gradient(ellipse 70% 90% at 68% 115%, rgba(255,82,82,0.20) 0%, rgba(15,10,13,0.98) 72%),
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
          backgroundSize: "28px 28px",
        }}
      />

      {/* 상단 헤더: 브랜드 로고 + 상태 뱃지 */}
      <div className="relative z-10 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-2.5">
          <KIcon icon="bitcoin" color={BITCOIN_COLOR} size={44} />
          <BtcTextLogo color="#fff" height={42} width={182} />
        </div>

        <div className="flex items-center gap-1.5 bg-black/40 backdrop-blur-md p-1.5 rounded-full border border-white/10">
          <span
            className={`flex items-center gap-1.5 pl-2.5 pr-3 py-1 text-lg font-bold rounded-full ${
              isUp ? "text-[#00E676] bg-emerald-500/20" : "text-[#FF5252] bg-rose-500/20"
            }`}
          >
            <span
              className="w-2 h-2 rounded-full animate-pulse"
              style={{ backgroundColor: themeColor }}
            />
            LIVE
          </span>
          <BtcSurgeTimeframeSelector
            selectedTimeframe={timeframe}
            isUp={isUp}
            triggerTextClassName="text-lg"
            onChangeTimeframe={onChangeTimeframe}
          />
        </div>
      </div>

      {/* 본문: 좌측 수치 · 우측 차트 */}
      <div className="relative z-10 flex flex-1 min-h-0 gap-6 py-4">
        <div className="flex flex-col flex-shrink-0" style={{ width: INFO_COLUMN_WIDTH }}>
          <div className="flex items-center mb-3">{ChangePercentTemplate}</div>

          {/* 원화 · 달러 현재가 ( 변동액은 선택 타임프레임 변동률 기준 ) */}
          <div className="flex flex-col gap-1">{PriceRowListTemplate}</div>
        </div>

        <div className="flex flex-1 min-w-0 flex-col justify-start">
          {!isChartDataReady && (
            <div
              className="w-full flex items-center justify-center text-base font-semibold text-neutral-500"
              style={{ aspectRatio: `${CHART_VIEWBOX_WIDTH} / ${CHART_VIEWBOX_HEIGHT}` }}
            >
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
          <div className="flex justify-between items-center text-base font-semibold text-white px-1 pt-1">
            <span>{timeframe} Ago</span>
            <span>Now</span>
          </div>
        </div>
      </div>

      {/* 매크로 지표 줄 ( 오버뷰 위젯과 같은 지표 ) */}
      <div className="relative z-10 grid flex-shrink-0 grid-cols-4 gap-4 py-4 border-t border-white/10">
        {MacroItemListTemplate}
      </div>

      {/* 하단 메타 정보 ( 좌측 서비스 도메인은 SNS 확산용 워터마크 ) */}
      <div className="relative z-10 flex flex-shrink-0 justify-between items-center gap-2 text-base font-medium text-neutral-200 pt-4 border-t border-white/10">
        <span
          className="flex items-center gap-2 font-jetbrains font-black tracking-wider text-white uppercase whitespace-nowrap flex-shrink-0"
          style={{ textShadow: `0 0 16px ${themeColor}80` }}
        >
          <span
            className="w-2 h-2 rounded-full flex-shrink-0"
            style={{ backgroundColor: themeColor }}
          />
          {SERVICE_DOMAIN}
        </span>
        <span className="font-number min-w-0 truncate">{capturedAtKst}</span>
      </div>
    </div>
  );
}

const MemoizedBtcSurgeWideShareCard = memo(BtcSurgeWideShareCard);
MemoizedBtcSurgeWideShareCard.displayName = "BtcSurgeWideShareCard";

export default MemoizedBtcSurgeWideShareCard;
