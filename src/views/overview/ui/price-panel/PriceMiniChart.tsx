"use client";

import { memo, useId, useMemo } from "react";
import { usePriceMiniChartData } from "@/entities/bitcoin/client";
import useSettingStore from "@/shared/stores/settingStore";

interface PriceMiniChartProps {
  barCount?: number;
  width?: number;
  height?: number;
  upColor?: string;
  downColor?: string;
}

interface BarShape {
  x: number;
  y: number;
  height: number;
  isUp: boolean;
  opacity: number;
}

function PriceMiniChart({
  barCount = 10,
  width = 140,
  height = 60,
  upColor = "var(--up-color)",
  downColor = "var(--down-color)",
}: PriceMiniChartProps) {
  // region [Hooks]
  const theme = useSettingStore((state) => state.theme);
  const { priceMiniChartData } = usePriceMiniChartData();
  const rawId = useId();
  const glowId = `priceMiniChartGlow-${rawId.replace(/:/g, "")}`;

  const data = useMemo<number[]>(() => priceMiniChartData?.price ?? [], [priceMiniChartData]);

  /**
   * 가격 시계열을 N개 버킷으로 나눠 캔들형 막대 데이터로 변환.
   * - 막대의 세로 위치/높이: 버킷 high/low 가격 범위 기준
   * - 색상(상승/하락): 버킷 open(첫 값) vs close(마지막 값) 비교
   */
  const barShapes = useMemo<BarShape[]>(() => {
    if (!data.length || barCount < 1) return [];

    const bucketSize = Math.max(1, Math.floor(data.length / barCount));
    const buckets: number[][] = [];
    for (let i = 0; i < barCount; i++) {
      const start = i * bucketSize;
      const end = i === barCount - 1 ? data.length : start + bucketSize;
      const slice = data.slice(start, end);
      if (slice.length > 0) buckets.push(slice);
    }
    if (!buckets.length) return [];

    const stats = buckets.map((bucket) => ({
      high: Math.max(...bucket),
      low: Math.min(...bucket),
      open: bucket[0],
      close: bucket[bucket.length - 1],
    }));

    const globalMax = Math.max(...stats.map((s) => s.high));
    const globalMin = Math.min(...stats.map((s) => s.low));
    const priceRange = globalMax - globalMin || 1;

    const barWidth = 6;
    const gap = 6;
    const totalWidth = buckets.length * barWidth + (buckets.length - 1) * gap;
    const startX = (width - totalWidth) / 2;
    const minBarHeight = barWidth;

    return stats.map((s, i) => {
      const usableHeight = height - minBarHeight;
      const yTop = ((globalMax - s.high) / priceRange) * usableHeight;
      const yBottom = ((globalMax - s.low) / priceRange) * usableHeight + minBarHeight;
      const barHeight = Math.max(minBarHeight, yBottom - yTop);

      // 차트 길이에 맞춰 opacity를 3단계로 다르게 설정 (3~5개 등 원하는 단계로 변경 가능)
      // 라이트 모드는 배경이 밝아 흐리게 보이므로 다크 모드보다 진하게 설정
      const opacities = theme === "light" ? [0.7, 0.85, 1.0] : [0.5, 0.75, 1.0];
      const normalizedHeight = usableHeight > 0 ? (barHeight - minBarHeight) / usableHeight : 0;
      const stepIndex = Math.min(
        opacities.length - 1,
        Math.floor(normalizedHeight * opacities.length),
      );
      const opacity = opacities[stepIndex];

      return {
        x: startX + i * (barWidth + gap),
        y: yTop,
        height: barHeight,
        isUp: s.close >= s.open,
        opacity,
      };
    });
  }, [data, barCount, width, height, theme]);
  // endregion

  if (!barShapes.length) return null;

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
      </defs>
      {barShapes.map((bar, i) => (
        <rect
          key={i}
          x={bar.x}
          y={bar.y}
          width={6}
          height={bar.height}
          rx={3}
          ry={3}
          fill={bar.isUp ? upColor : downColor}
          filter={`url(#${glowId})`}
          opacity={bar.opacity}
        />
      ))}
    </svg>
  );
}

const MemoizedPriceMiniChart = memo(PriceMiniChart);
MemoizedPriceMiniChart.displayName = "PriceMiniChart";

export default MemoizedPriceMiniChart;
