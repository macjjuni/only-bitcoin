"use client";

import { KIcon } from "kku-ui";
import { memo, type RefObject, useCallback, useId, useMemo, useState } from "react";
import { type MarketChartIntervalType, useBitcoinStore } from "@/entities/bitcoin";
import { useMarketChartData } from "@/entities/bitcoin/client";
import { getCurrentDateTimeKST } from "@/shared/lib/date";
import { BtcTextLogo, UpdownIcon } from "@/shared/ui";

type ShareCardTimeframe = "1D" | "7D" | "1M";

const TIMEFRAME_LIST: readonly ShareCardTimeframe[] = ["1D", "7D", "1M"];

/** 카드 타임프레임 → 마켓 차트 조회 인터벌 매핑 */
const TIMEFRAME_INTERVAL_MAP: Record<ShareCardTimeframe, MarketChartIntervalType> = {
  "1D": "1d",
  "7D": "7d",
  "1M": "1m",
};

/** 곡선을 그리기 위해 필요한 최소 가격 포인트 개수 */
const MINIMUM_CHART_POINT_COUNT = 10;

/**
 * SNS 확산( 네트워크 효과 )을 위한 서비스 도메인.
 *
 * 캡처 시점에만 노출하는 방식은 `html-to-image` 에 클론 훅이 없어 DOM 토글이 필요하고,
 * 그 리렌더 대기 구간이 Safari 클립보드의 user gesture 동기 제약을 깨뜨리므로 상시 노출한다.
 */
const SERVICE_DOMAIN = "ONLY-BTC.APP";

export const BTC_SURGE_CARD_DESIGN_WIDTH = 440;

export interface BtcSurgeShareCardProps {
  cardRef?: RefObject<HTMLDivElement | null>;
}

/**
 * 2개 이상의 포인트 배열에서 매끄러운 곡선 SVG Path 생성
 */
function generateSvgCurvePath(data: number[], width: number, height: number) {
  if (!data || data.length < 2) {
    return { linePath: "", areaPath: "", lastX: width, lastY: height / 2 };
  }

  const minPrice = Math.min(...data);
  const maxPrice = Math.max(...data);
  const priceRange = maxPrice - minPrice || 1;

  const points = data.map((price, pointIndex) => {
    const x = (pointIndex / (data.length - 1)) * width;
    // 하단 및 상단 12px 패딩 고려
    const y = height - ((price - minPrice) / priceRange) * (height - 24) - 12;
    return { x, y };
  });

  let linePath = `M ${points[0].x.toFixed(2)},${points[0].y.toFixed(2)}`;
  for (let pointIndex = 0; pointIndex < points.length - 1; pointIndex++) {
    const startPoint = points[pointIndex];
    const endPoint = points[pointIndex + 1];
    const controlPointX = ((startPoint.x + endPoint.x) / 2).toFixed(2);
    linePath += ` C ${controlPointX},${startPoint.y.toFixed(2)} ${controlPointX},${endPoint.y.toFixed(2)} ${endPoint.x.toFixed(2)},${endPoint.y.toFixed(2)}`;
  }

  const lastPoint = points[points.length - 1];
  const areaPath = `${linePath} L ${lastPoint.x.toFixed(2)},${height} L ${points[0].x.toFixed(2)},${height} Z`;

  return { linePath, areaPath, lastX: lastPoint.x, lastY: lastPoint.y };
}

/**
 * 현재가와 변동률로부터 해당 통화의 변동액을 역산.
 *
 * 차트는 바이낸스 BTCUSDT( 달러 ) 기준이라 원화 시계열이 없으므로, 변동률을 각 통화의
 * 현재가에 적용해 변동액을 구한다. ( 기간 내 환율 변동은 반영되지 않는 근사값 )
 */
function calculateChangeAmount(currentPrice: number, changeRatePercent: number): number {
  const changeRate = changeRatePercent / 100;

  if (currentPrice <= 0 || changeRate <= -1) {
    return 0;
  }

  return Math.round(currentPrice - currentPrice / (1 + changeRate));
}

function BtcSurgeShareCard({ cardRef }: BtcSurgeShareCardProps) {
  // region [Hooks]
  const [timeframe, setTimeframe] = useState<ShareCardTimeframe>("1D");
  const rawId = useId();
  const glowFilterId = `surgeGlow-${rawId.replace(/:/g, "")}`;
  const gradientId = `surgeGrad-${rawId.replace(/:/g, "")}`;

  const bitcoinPrice = useBitcoinStore((state) => state.bitcoinPrice);
  const { marketChartData } = useMarketChartData(TIMEFRAME_INTERVAL_MAP[timeframe]);

  // 카드가 열린 시각을 고정한다. 다이얼로그가 닫히면 언마운트되므로 열 때마다 다시 계산.
  const [capturedAtKst] = useState<string>(getCurrentDateTimeKST);

  /** 바이낸스 BTCUSDT 종가 시계열 ( 달러 기준 ) */
  const usdPrices = useMemo<number[]>(() => {
    if (marketChartData?.price && marketChartData.price.length >= MINIMUM_CHART_POINT_COUNT) {
      return marketChartData.price;
    }
    return [];
  }, [marketChartData]);

  const isChartDataReady = usdPrices.length >= 2;

  const changePercent = useMemo(() => {
    if (timeframe === "1D" && bitcoinPrice?.usdChange24h) {
      return Number.parseFloat(bitcoinPrice.usdChange24h);
    }

    if (isChartDataReady) {
      const startPrice = usdPrices[0];
      const endPrice = usdPrices[usdPrices.length - 1];
      if (startPrice > 0) return ((endPrice - startPrice) / startPrice) * 100;
    }
    if (bitcoinPrice?.usdChange24h) return Number.parseFloat(bitcoinPrice.usdChange24h);
    return 0;
  }, [timeframe, usdPrices, bitcoinPrice, isChartDataReady]);

  const isUp = changePercent >= 0;

  const currentPriceKrw = useMemo(() => {
    if (bitcoinPrice?.krw && bitcoinPrice.krw > 0) return bitcoinPrice.krw;
    return 0;
  }, [bitcoinPrice]);

  const currentPriceUsd = useMemo(() => {
    if (bitcoinPrice?.usd && bitcoinPrice.usd > 0) return bitcoinPrice.usd;
    if (isChartDataReady) return usdPrices[usdPrices.length - 1];
    return 0;
  }, [bitcoinPrice, usdPrices, isChartDataReady]);

  const changeAmountKrw = useMemo(
    () => calculateChangeAmount(currentPriceKrw, changePercent),
    [currentPriceKrw, changePercent],
  );

  const changeAmountUsd = useMemo(
    () => calculateChangeAmount(currentPriceUsd, changePercent),
    [currentPriceUsd, changePercent],
  );

  const { linePath, areaPath, lastX, lastY } = useMemo(
    () => generateSvgCurvePath(usdPrices, 360, 140),
    [usdPrices],
  );

  const themeColor = isUp ? "#00E676" : "#FF5252";
  // endregion

  // region [Events]
  const onClickTimeframe = (selectedTimeframe: ShareCardTimeframe) => {
    setTimeframe(selectedTimeframe);
  };
  // endregion


  /** canvas에 이미지를 그려 래스터화 — html-to-image iOS 캡처 호환 */
  const coinCanvasRef = useCallback((canvas: HTMLCanvasElement | null) => {
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const img = new Image();
    img.onload = () => {
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0);
    };
    img.src = "/images/btc-3d-card.png";
  }, []);

  // region [Templates]
  const changeSign = isUp ? "+" : "-";

  const currentPriceUsdText = useMemo(
    () => currentPriceUsd.toLocaleString("en-US", { maximumFractionDigits: 0 }),
    [currentPriceUsd],
  );

  const changeAmountKrwText = useMemo(
    () => Math.abs(changeAmountKrw).toLocaleString(),
    [changeAmountKrw],
  );

  const changeAmountUsdText = useMemo(
    () => Math.abs(changeAmountUsd).toLocaleString("en-US"),
    [changeAmountUsd],
  );
  // endregion

  return (
    <div
      ref={cardRef}
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
          <KIcon icon="bitcoin" color="#F7931A" size={38} />
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
          {TIMEFRAME_LIST.map((tf) => (
            <button
              key={tf}
              type="button"
              onClick={() => onClickTimeframe(tf)}
              className={`px-2 py-1 text-sm font-bold rounded-full transition-colors cursor-pointer ${
                timeframe === tf
                  ? isUp
                    ? "bg-[#00E676] text-black shadow-md"
                    : "bg-[#FF5252] text-white shadow-md"
                  : "text-neutral-400 hover:text-neutral-200"
              }`}
            >
              {tf}
            </button>
          ))}
        </div>
      </div>

      {/* 수치 및 가격 강조 섹션 */}
      <div className="relative z-10 mb-0">
        <div className="flex items-baseline gap-2 mb-1">
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
            {changePercent.toFixed(2)}%
          </span>
        </div>

        {/* 원화 · 달러 현재가 ( 변동액은 선택 타임프레임 변동률 기준 ) */}
        <div className="flex flex-col">
          <div className="flex items-baseline justify-start gap-2">
            <span className="text-2xl font-black text-white tracking-tight font-number">
              {currentPriceKrw > 0 ? `₩${currentPriceKrw.toLocaleString()}` : "-"}
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

      <canvas
        ref={coinCanvasRef}
        className="absolute top-20 right-6 w-[116px] h-[116px] pointer-events-none"
        style={{ filter: `drop-shadow(0 0 20px ${themeColor}80)` }}
      />

      <div className="relative z-10 w-full my-3">
        <svg viewBox="0 0 360 140" className="w-full h-auto overflow-visible" aria-hidden="true">
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

        {/* 차트 가로축 시간 텍스트 (영문) */}
        <div className="flex justify-between items-center text-sm font-semibold text-white px-1">
          <span>{timeframe} Ago</span>
          <span>Now</span>
        </div>
      </div>

      {/* 하단 메타 정보 ( 좌측 서비스 도메인은 SNS 확산용 워터마크 ) */}
      <div className="relative z-10 flex justify-between items-center gap-2 text-sm font-medium text-neutral-200 pt-4 border-t border-white/10">
        <span
          className="flex items-center gap-1.5 font-black tracking-wider text-white text-sm uppercase whitespace-nowrap flex-shrink-0"
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

export { MemoizedBtcSurgeShareCard as BtcSurgeShareCard };
export default MemoizedBtcSurgeShareCard;
