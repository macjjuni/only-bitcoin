"use client";

import { useId, useMemo } from "react";
import { usePriceMiniChartData } from "@/shared/query";

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
}

export default function PriceMiniChart({
  barCount = 10,
  width = 140,
  height = 60,
  upColor = "var(--up-color)",
  downColor = "var(--down-color)",
}: PriceMiniChartProps) {
  // region [Hooks]
  const { priceMiniChartData } = usePriceMiniChartData();
  const rawId = useId();
  const glowId = `priceMiniChartGlow-${rawId.replace(/:/g, "")}`;

  const data = useMemo<number[]>(() => priceMiniChartData?.price ?? [], [priceMiniChartData]);

  /**
   * 가격 시계열을 N개 버킷으로 나눠 캔들형 막대 데이터로 변환한다.
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

      return {
        x: startX + i * (barWidth + gap),
        y: yTop,
        height: barHeight,
        isUp: s.close >= s.open,
      };
    });
  }, [data, barCount, width, height]);
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
        />
      ))}
    </svg>
  );
}
