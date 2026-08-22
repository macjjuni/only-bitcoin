import type { ApexOptions } from "apexcharts";
import { BITCOIN_COLOR } from "@/shared/config/color";

export interface CreateChartOptionsParams {
  isDark: boolean;
  formatter: (val: number) => string;
  maxPoint: { x: number; y: number } | null;
  maxPointRatio: number;
  strokeWidth: number;
  fillOpacityTo: { light: number; dark: number };
  fillStops: [number, number];
}

/**
 * 두 차트(Market/MiningMetric)가 공유하는 ApexOptions 객체 생성
 * 시각 차이값(strokeWidth, fillOpacityTo, fillStops)은 호출부에서 주입
 */
/**
 * 최고점 위치 비율(0~1)에 따라 라벨 앵커와 오프셋 결정
 * 좌측 끝 → start, 우측 끝 → end, 중앙 → middle
 */
const getMaxPointLabelPosition = (ratio: number) => {
  if (ratio < 0.15) return { textAnchor: "start" as const, offsetX: 8 };
  if (ratio > 0.85) return { textAnchor: "end" as const, offsetX: -8 };
  return { textAnchor: "middle" as const, offsetX: 0 };
};

export const createChartOptions = ({
  isDark,
  formatter,
  maxPoint,
  maxPointRatio,
  strokeWidth,
  fillOpacityTo,
  fillStops,
}: CreateChartOptionsParams): ApexOptions => ({
  chart: {
    type: "area",
    toolbar: { show: false },
    zoom: { enabled: false },
    background: "transparent",
    animations: { enabled: false },
  },
  theme: { mode: isDark ? "dark" : "light" },
  colors: [BITCOIN_COLOR],
  stroke: { curve: "smooth", width: strokeWidth },
  fill: {
    type: "gradient",
    colors: [BITCOIN_COLOR],
    gradient: {
      shadeIntensity: 1,
      opacityFrom: isDark ? 0.66 : 0.7,
      opacityTo: isDark ? fillOpacityTo.dark : fillOpacityTo.light,
      stops: fillStops,
    },
  },
  markers: {
    size: 0,
    colors: [BITCOIN_COLOR],
    hover: { size: 4, sizeOffset: 0 },
  },
  tooltip: {
    theme: isDark ? "dark" : "light",
    x: {
      show: true,
      format: "yyyy.MM.dd",
    },
    y: { formatter },
    marker: { show: false },
    style: { fontSize: "12px", fontFamily: "Roboto Mono" },
  },
  xaxis: {
    type: "datetime",
    labels: { show: false },
    axisBorder: { show: false },
    axisTicks: { show: false },
    crosshairs: {
      stroke: {
        color: isDark ? "rgba(255,255,255,0.4)" : "rgba(0,0,0,0.4)",
        width: 1,
        dashArray: 3,
      },
    },
    tooltip: { enabled: false },
  },
  yaxis: { show: false, tickAmount: 6 },
  grid: {
    borderColor: isDark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.06)",
    strokeDashArray: 3,
    xaxis: { lines: { show: false } },
    yaxis: { lines: { show: true } },
    padding: { left: 0, right: 0, top: 0, bottom: 0 },
  },
  dataLabels: { enabled: false },
  annotations: {
    yaxis: [],
    xaxis: [],
    texts: [],
    images: [],
    shapes: [],
    points: maxPoint
      ? [
          {
            x: maxPoint.x,
            y: maxPoint.y,
            marker: {
              size: 4,
              fillColor: BITCOIN_COLOR,
              strokeColor: "#fff",
              strokeWidth: 2,
            },
            label: {
              text: formatter(maxPoint.y),
              borderColor: isDark ? "#fff" : "#000",
              borderWidth: 1,
              borderRadius: 4,
              fontFamily: "Roboto Mono",
              textAnchor: getMaxPointLabelPosition(maxPointRatio).textAnchor,
              offsetX: getMaxPointLabelPosition(maxPointRatio).offsetX,
              style: {
                background: isDark ? "hsl(0 0% 7.1%)" : "#fff",
                color: isDark ? "#fff" : "#000",
                fontSize: "12px",
                fontWeight: 600,
                padding: {
                  left: 8,
                  right: 8,
                  top: 3,
                  bottom: 4,
                },
              },
            },
          },
        ]
      : [],
  } as unknown as ApexOptions["annotations"],
});
