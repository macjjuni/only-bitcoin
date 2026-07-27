"use client";

import { KIcon } from "kku-ui";
import { memo, type RefObject, useId, useMemo, useState } from "react";
import { useBitcoinStore } from "@/entities/bitcoin";
import {
  formatKoreanVolume,
  useBtcTickerQuery,
  useMarketChartData,
  usePriceMiniChartData,
} from "@/entities/bitcoin/client";

export interface BtcSurgeShareCardProps {
  /** 수동 타임프레임 선택 ( 기본: 1D ) */
  initialTimeframe?: "1D" | "7D" | "30D";
  cardRef?: RefObject<HTMLDivElement | null>;
}

/**
 * 2개 이상의 포인트 배열에서 매끄러운 곡선 SVG Path 생성
 */
function generateSvgCurvePath(data: number[], width: number, height: number) {
  if (!data || data.length < 2) {
    return { linePath: "", areaPath: "", lastX: width, lastY: height / 2 };
  }

  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;

  const points = data.map((val, i) => {
    const x = (i / (data.length - 1)) * width;
    // 하단 및 상단 12px 패딩 고려
    const y = height - ((val - min) / range) * (height - 24) - 12;
    return { x, y };
  });

  let linePath = `M ${points[0].x.toFixed(2)},${points[0].y.toFixed(2)}`;
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i];
    const p1 = points[i + 1];
    const cpX = ((p0.x + p1.x) / 2).toFixed(2);
    linePath += ` C ${cpX},${p0.y.toFixed(2)} ${cpX},${p1.y.toFixed(2)} ${p1.x.toFixed(2)},${p1.y.toFixed(2)}`;
  }

  const lastPoint = points[points.length - 1];
  const areaPath = `${linePath} L ${lastPoint.x.toFixed(2)},${height} L ${points[0].x.toFixed(2)},${height} Z`;

  return { linePath, areaPath, lastX: lastPoint.x, lastY: lastPoint.y, min, max };
}

function BtcSurgeShareCard({ initialTimeframe = "1D", cardRef }: BtcSurgeShareCardProps) {
  const [timeframe, setTimeframe] = useState<"1D" | "7D" | "30D">(initialTimeframe);
  const rawId = useId();
  const glowFilterId = `surgeGlow-${rawId.replace(/:/g, "")}`;
  const gradientId = `surgeGrad-${rawId.replace(/:/g, "")}`;

  // 실시간 비트코인 24h Ticker & 스토어 데이터
  const { data: btcTicker } = useBtcTickerQuery();
  
  const bitcoinPrice = useBitcoinStore((state) => state.bitcoinPrice);
  const { priceMiniChartData } = usePriceMiniChartData();
  const { marketChartData: marketChart7d } = useMarketChartData("7d");
  const { marketChartData: marketChart30d } = useMarketChartData("1m");

  // 1D (24시간 5분봉 전체) 시계열 가격 데이터
  const full1dPrices = useMemo<number[]>(() => {
    if (priceMiniChartData?.price && priceMiniChartData.price.length >= 10) {
      return priceMiniChartData.price;
    }
    return [
      96400, 96800, 96300, 97100, 96900, 97400, 97000, 97800, 97500, 98200, 98000, 98900, 98600,
      99500, 99100, 100200, 99800, 101100, 100800, 102400, 101900, 103200, 102800, 104519,
    ];
  }, [priceMiniChartData]);

  // 선택한 timeframe (1D, 7D, 30D) 에 따른 가격 배열 동적 반영
  const rawPrices = useMemo<number[]>(() => {
    if (timeframe === "7D" && marketChart7d?.price && marketChart7d.price.length >= 10) {
      return marketChart7d.price;
    }
    if (timeframe === "30D" && marketChart30d?.price && marketChart30d.price.length >= 10) {
      return marketChart30d.price;
    }
    return full1dPrices;
  }, [timeframe, full1dPrices, marketChart7d, marketChart30d]);

  // 현재 실시간 표시 가격
  const currentPrice = useMemo(() => {
    if (bitcoinPrice?.krw && bitcoinPrice.krw > 0) {
      return bitcoinPrice.krw;
    }
    const lastRaw = rawPrices[rawPrices.length - 1];
    return lastRaw > 1000000 ? lastRaw : 104519000;
  }, [bitcoinPrice, rawPrices]);

  // 기간 내 변동률 (%)
  const changePercent = useMemo(() => {
    if (rawPrices.length >= 2) {
      const start = rawPrices[0];
      const end = rawPrices[rawPrices.length - 1];
      if (start > 0) {
        return ((end - start) / start) * 100;
      }
    }
    if (bitcoinPrice?.krwChange24h) {
      return parseFloat(bitcoinPrice.krwChange24h);
    }
    return 8.4;
  }, [rawPrices, bitcoinPrice]);

  const isUp = changePercent >= 0;

  // 선택된 timeframe 기간 내 변동 금액
  const changeAmount = useMemo(() => {
    if (rawPrices.length >= 2) {
      const start = rawPrices[0];
      const end = rawPrices[rawPrices.length - 1];
      const diff = end - start;
      // KRW 실제 스케일 보정
      if (start < 1000000 && currentPrice > 1000000) {
        return Math.round((currentPrice * changePercent) / 100);
      }
      return Math.round(diff);
    }
    return Math.round((currentPrice * changePercent) / 100);
  }, [rawPrices, currentPrice, changePercent]);

  // 업비트 24H Ticker REST API에서 24시간 최고가 / 최저가 직접 수신
  const high24h = useMemo(() => {
    if (btcTicker?.high_price && btcTicker.high_price > 0) {
      return btcTicker.high_price;
    }
    return Math.round(currentPrice * 1.05);
  }, [btcTicker, currentPrice]);

  const low24h = useMemo(() => {
    if (btcTicker?.low_price && btcTicker.low_price > 0) {
      return btcTicker.low_price;
    }
    return Math.round(currentPrice * 0.95);
  }, [btcTicker, currentPrice]);

  // 24시간 실시간 누적 거래량 (원화 기준 가독 단위 변환)
  const formattedVolume = useMemo(() => {
    if (btcTicker?.acc_trade_price_24h) {
      return formatKoreanVolume(btcTicker.acc_trade_price_24h);
    }
    return "3.5조";
  }, [btcTicker]);

  // 오늘 날짜 KST
  const formattedTimestamp = useMemo(() => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const day = String(now.getDate()).padStart(2, "0");
    const hours = String(now.getHours()).padStart(2, "0");
    const minutes = String(now.getMinutes()).padStart(2, "0");
    return `${year}.${month}.${day} · ${hours}:${minutes} KST`;
  }, []);

  // SVG 차트 계산 (가로 360, 세로 140)
  const { linePath, areaPath, lastX, lastY } = useMemo(
    () => generateSvgCurvePath(rawPrices, 360, 140),
    [rawPrices],
  );

  const themeColor = isUp ? "#00E676" : "#FF5252";

  return (
    <div
      ref={cardRef}
      className={`relative w-full max-w-[440px] mx-auto rounded-[32px] p-6 text-white select-none overflow-hidden border transition-all duration-300 ${
        isUp
          ? "border-emerald-500/30 shadow-[0_20px_50px_rgba(0,0,0,0.8),0_0_40px_rgba(0,230,118,0.15)] bg-[#0a0d14]"
          : "border-rose-500/30 shadow-[0_20px_50px_rgba(0,0,0,0.8),0_0_40px_rgba(255,82,82,0.15)] bg-[#0f0a0d]"
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
          <KIcon icon="bitcoin" color="white" size={28} />
          <span className="font-black tracking-wider text-2xl sm:text-xl uppercase text-white font-sans">
            BITCOIN
          </span>
        </div>

        <div className="flex items-center gap-1 bg-black/40 backdrop-blur-md p-1 rounded-full border border-white/10">
          <span
            className={`flex items-center gap-1 px-2 py-0.5 text-[11px] font-bold rounded-full ${
              isUp ? "text-[#00E676] bg-emerald-500/10" : "text-[#FF5252] bg-rose-500/10"
            }`}
          >
            <span
              className="w-1.5 h-1.5 rounded-full animate-pulse"
              style={{ backgroundColor: themeColor }}
            />
            LIVE
          </span>
          {(["1D", "7D", "30D"] as const).map((tf) => (
            <button
              key={tf}
              type="button"
              onClick={() => setTimeframe(tf)}
              className={`px-2 py-0.5 text-[11px] font-bold rounded-full transition-colors cursor-pointer ${
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
      <div className="relative z-10 mb-4">
        <div className="flex items-baseline gap-2 mb-1">
          <span
            className="text-4xl sm:text-5xl font-black tracking-tight"
            style={{
              color: themeColor,
              filter: isUp
                ? "drop-shadow(0 0 25px rgba(0,230,118,0.45))"
                : "drop-shadow(0 0 25px rgba(255,82,82,0.45))",
            }}
          >
            {isUp ? "▲" : "▼"} {isUp ? "+" : ""}
            {changePercent.toFixed(2)}%
          </span>
        </div>

        <div className="flex items-baseline gap-2.5">
          <span className="text-2xl sm:text-3xl font-black text-white tracking-tight">
            ₩{currentPrice.toLocaleString()}
          </span>
          <span className="text-sm font-bold tracking-tight" style={{ color: themeColor }}>
            {isUp ? "+" : "-"}₩{Math.abs(changeAmount).toLocaleString()}
          </span>
        </div>
      </div>

      {/* 스파크라인 SVG 차트 섹션 */}
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
          <g transform={`translate(${lastX}, ${lastY})`}>
            <circle r="7" fill={themeColor} className="animate-ping opacity-75" />
            <circle r="4" fill="#FFFFFF" stroke={themeColor} strokeWidth="2" />
          </g>
        </svg>

        {/* 차트 가로축 시간 텍스트 (영문) */}
        <div className="flex justify-between items-center text-[11px] font-semibold text-white mt-1 px-1">
          <span>{timeframe} Ago</span>
          <span>Now</span>
        </div>
      </div>

      {/* 24시간 하단 스탯 박스 메트릭스 */}
      <div className="relative z-10 grid grid-cols-3 gap-2 p-3.5 rounded-2xl bg-white/[0.04] backdrop-blur-md border border-white/10 my-4 text-center">
        <div>
          <div className="text-[11px] font-medium text-neutral-400 mb-0.5">24H 고가</div>
          <div className="text-xs sm:text-sm font-bold text-white font-mono">
            ₩{high24h.toLocaleString()}
          </div>
        </div>
        <div className="border-x border-white/10 px-1">
          <div className="text-[11px] font-medium text-neutral-400 mb-0.5">24H 저가</div>
          <div className="text-xs sm:text-sm font-bold text-white font-mono">
            ₩{low24h.toLocaleString()}
          </div>
        </div>
        <div>
          <div className="text-[11px] font-medium text-neutral-400 mb-0.5">거래량</div>
          <div className="text-xs sm:text-sm font-bold font-mono" style={{ color: themeColor }}>
            {formattedVolume}
          </div>
        </div>
      </div>

      {/* 하단 메타 정보 */}
      <div className="relative z-10 flex justify-between items-center text-[11px] font-medium text-neutral-400 pt-4 border-t border-white/10">
        <span>BTC / KRW · INDEX</span>
        <span>{formattedTimestamp}</span>
      </div>
    </div>
  );
}

const MemoizedBtcSurgeShareCard = memo(BtcSurgeShareCard);
MemoizedBtcSurgeShareCard.displayName = "BtcSurgeShareCard";

export { MemoizedBtcSurgeShareCard as BtcSurgeShareCard };
export default MemoizedBtcSurgeShareCard;
