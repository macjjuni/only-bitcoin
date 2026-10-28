"use client";

import { memo, useEffect, useId, useMemo } from "react";
import { useBitcoinStore } from "@/entities/bitcoin";
import { usePriceMiniChartData } from "@/entities/bitcoin/client";
import useSettingStore from "@/shared/stores/settingStore";
import { defaultPricePointCapacity } from "./priceSeriesBuffer";
import { usePriceSeriesBuffer } from "./usePriceSeriesBuffer";

interface PriceMiniChartProps {
  pointCount?: number;
  width?: number;
  height?: number;
  upColor?: string;
  downColor?: string;
}

interface LineChartShape {
  linePath: string;
  areaPath: string;
  lastPointX: number;
  lastPointY: number;
  isUp: boolean;
}

/** 라이브 점 반지름. 펄스 링은 이 값을 기준으로 최대 3배까지 번진다. */
const livePointRadius = 2.5;
const livePulseMaxScale = 3;
/** 끝점의 펄스 링이 잘리지 않도록 그리기 영역을 안쪽으로 물린다. */
const chartPadding = livePointRadius * livePulseMaxScale;

function PriceMiniChart({
  pointCount = defaultPricePointCapacity,
  width = 140,
  height = 60,
  upColor = "var(--up-color)",
  downColor = "var(--down-color)",
}: PriceMiniChartProps) {
  // region [Hooks]
  const theme = useSettingStore((state) => state.theme);
  const { priceMiniChartData } = usePriceMiniChartData();
  const rawId = useId();
  const safeId = rawId.replace(/:/g, "");
  const glowId = `priceMiniChartGlow-${safeId}`;
  const areaGradientId = `priceMiniChartArea-${safeId}`;

  const data = useMemo<number[]>(() => priceMiniChartData?.price ?? [], [priceMiniChartData]);

  /**
   * 원본 5분봉 288개를 화면 폭에 맞는 길이로 줄여 들고 있는다.
   * 넘치는 과거 포인트는 버퍼에서 버려지므로 보관량은 `pointCount` 로 고정된다.
   */
  const { pricePoints, pointLength, revision, updateLatestPrice } = usePriceSeriesBuffer(
    data,
    pointCount,
  );

  /**
   * 실시간 시세는 이미 열려 있는 USD 시세 소켓에서 받아 끝 포인트만 갱신한다.
   *
   * 창이 24시간이라 1초 변동은 1픽셀에 한참 못 미친다. 움직임을 보여 주려는 게 아니라
   * 끝점이 현재가와 어긋나지 않게 맞춰 두려는 것이므로, 이 용도로 소켓을 새로 열지 않는다.
   *
   * 끊긴 동안에는 0으로 읽어 갱신을 건너뛴다. persist 로 복원된 지난 세션 가격이
   * 현재 윈도우의 최고·최저 범위를 왜곡하는 걸 막는다.
   */
  const liveUsdPrice = useBitcoinStore((state) =>
    state.bitcoinPrice.isUsdConnected ? state.bitcoinPrice.usd : 0,
  );

  /**
   * 가격 윈도우를 라인/영역 path 로 변환.
   * - 세로 위치: 윈도우 전체의 최고·최저 가격을 기준으로 정규화
   * - 색상(상승/하락): 윈도우의 첫 값 vs 마지막 값 비교
   */
  const lineChartShape = useMemo<LineChartShape | null>(() => {
    if (pointLength < 2) {
      return null;
    }

    let highestPrice = pricePoints[0];
    let lowestPrice = pricePoints[0];
    for (let pointIndex = 1; pointIndex < pointLength; pointIndex += 1) {
      const price = pricePoints[pointIndex];
      if (price > highestPrice) highestPrice = price;
      if (price < lowestPrice) lowestPrice = price;
    }

    const priceRange = highestPrice - lowestPrice;
    const drawableWidth = width - chartPadding * 2;
    const drawableHeight = height - chartPadding * 2;
    const horizontalStep = drawableWidth / (pointLength - 1);
    /*
      창 안의 가격이 전부 같으면 정규화 분모가 0 이다. 분모만 1 로 바꿔 두면 모든 포인트가
      `(최고가 - 가격) / 1 = 0` 이 되어 라인이 그리기 영역 맨 위에 달라붙으므로,
      이 경우에는 비율 자체를 중앙으로 고정한다.
    */
    const isFlatRange = priceRange === 0;

    let linePath = "";
    let lastPointX = chartPadding;
    let lastPointY = chartPadding;

    for (let pointIndex = 0; pointIndex < pointLength; pointIndex += 1) {
      const pointX = chartPadding + pointIndex * horizontalStep;
      const verticalRatio = isFlatRange
        ? 0.5
        : (highestPrice - pricePoints[pointIndex]) / priceRange;
      const pointY = chartPadding + verticalRatio * drawableHeight;

      linePath += `${pointIndex === 0 ? "M" : "L"}${pointX.toFixed(2)} ${pointY.toFixed(2)}`;
      lastPointX = pointX;
      lastPointY = pointY;
    }

    const areaBottomY = height - chartPadding;
    const areaPath = `${linePath}L${lastPointX.toFixed(2)} ${areaBottomY}L${chartPadding} ${areaBottomY}Z`;

    return {
      linePath,
      areaPath,
      lastPointX,
      lastPointY,
      isUp: pricePoints[pointLength - 1] >= pricePoints[0],
    };
    // pricePoints 는 재사용되는 저장소라 참조가 고정이므로 revision 으로 갱신을 받는다.
  }, [pricePoints, pointLength, revision, width, height]);
  // endregion

  // region [Life Cycles]
  useEffect(() => {
    if (liveUsdPrice > 0) {
      updateLatestPrice(liveUsdPrice);
    }
  }, [liveUsdPrice, updateLatestPrice]);
  // endregion

  // region [Templates]
  if (!lineChartShape) return null;

  const lineColor = lineChartShape.isUp ? upColor : downColor;
  // 라이트 모드는 배경이 밝아 영역 그라데이션이 흐리게 보이므로 다크 모드보다 진하게 설정
  const areaTopOpacity = theme === "light" ? 0.28 : 0.2;
  // endregion

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      width={width}
      height={height}
      className="overflow-visible"
      aria-hidden="true"
    >
      <defs>
        <filter id={glowId} x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="1.6" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        <linearGradient id={areaGradientId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={lineColor} stopOpacity={areaTopOpacity} />
          <stop offset="100%" stopColor={lineColor} stopOpacity="0" />
        </linearGradient>
      </defs>

      <path d={lineChartShape.areaPath} fill={`url(#${areaGradientId})`} />

      <path
        d={lineChartShape.linePath}
        fill="none"
        stroke={lineColor}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
        filter={`url(#${glowId})`}
      />

      {/*
        끝점의 파동. 링 두 개를 절반 주기만큼 엇갈리게 돌려 끊김 없이 번지게 한다.

        지연을 음수로 주는 이유가 있다. 양수면 그 시간만큼은 애니메이션이 시작되지 않아
        링이 기본 상태( 반지름 그대로, 불투명 )로 멈춰 있어, 첫 주기에 점이 두 겹으로 보인다.
        음수 지연은 주기 중간부터 재생하므로 처음부터 엇갈린 상태로 돈다.

        transform-box 를 fill-box 로 두어야 원의 중심을 기준으로 scale 이 걸린다.
      */}
      {[0, -0.95].map((pulseDelayInSeconds) => (
        <circle
          key={pulseDelayInSeconds}
          cx={lineChartShape.lastPointX}
          cy={lineChartShape.lastPointY}
          r={livePointRadius}
          fill={lineColor}
          className="animate-price-live-pulse motion-reduce:animate-none motion-reduce:opacity-0"
          style={{
            transformBox: "fill-box",
            transformOrigin: "center",
            animationDelay: `${pulseDelayInSeconds}s`,
          }}
        />
      ))}

      <circle
        cx={lineChartShape.lastPointX}
        cy={lineChartShape.lastPointY}
        r={livePointRadius}
        fill={lineColor}
        filter={`url(#${glowId})`}
      />
    </svg>
  );
}

const MemoizedPriceMiniChart = memo(PriceMiniChart);
MemoizedPriceMiniChart.displayName = "PriceMiniChart";

export default MemoizedPriceMiniChart;
