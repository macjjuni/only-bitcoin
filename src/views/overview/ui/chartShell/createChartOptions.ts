import type { ApexOptions } from "apexcharts";
import { BITCOIN_COLOR } from "@/shared/config/color";
import type { ChartSeriesPoint } from "./OverviewChartShell.interface";

export interface CreateChartOptionsParams {
  isDark: boolean;
  formatter: (val: number) => string;
  maxPoint: ChartSeriesPoint | null;
  maxPointRatio: number;
}

/**
 * 공유 카드( `BtcSurgeShareCard` ) 차트와 같은 시각 언어를 쓰기 위한 값.
 *
 * 굵은 라운드 곡선 + 바닥으로 사라지는 그라데이션이 한 벌이라
 * 차트별로 다르게 주지 않고 여기서 한 곳에 모아 둔다.
 * 글로우( 곡선 번짐 )는 `globals.css` 의 `.overview-chart` 가 담당.
 */
const CARD_CHART_STYLE = {
  strokeWidth: 3,
  fillOpacityFrom: 0.4,
  fillStops: [0, 100] as [number, number],
} as const;

/**
 * 최고점 위치 비율(0~1)에 따라 라벨 앵커와 오프셋 결정
 * 좌측 끝 → start, 우측 끝 → end, 중앙 → middle
 */
const getMaxPointLabelPosition = (ratio: number) => {
  if (ratio < 0.15) return { textAnchor: "start" as const, offsetX: 8 };
  if (ratio > 0.85) return { textAnchor: "end" as const, offsetX: -8 };
  return { textAnchor: "middle" as const, offsetX: 0 };
};

/**
 * 두 차트(Market/MiningMetric)가 공유하는 ApexOptions 객체 생성
 */
export const createChartOptions = ({
  isDark,
  formatter,
  maxPoint,
  maxPointRatio,
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
  /*
    `lineCap: "round"` 는 쓰지 않는다. ApexCharts 가 `stroke.lineCap` 을 마커 패스에도
    물려 주는데, 대기 상태의 호버 마커는 반지름 0 짜리 빈 경로라 round 캡이 붙는 순간
    플롯 좌상단( 0,0 )에 흰 점으로 찍힌다. 곡선은 차트 폭을 꽉 채워 캡이 보이지도 않는다.
  */
  stroke: { curve: "smooth", width: CARD_CHART_STYLE.strokeWidth },
  fill: {
    type: "gradient",
    colors: [BITCOIN_COLOR],
    gradient: {
      shadeIntensity: 1,
      opacityFrom: CARD_CHART_STYLE.fillOpacityFrom,
      opacityTo: 0,
      stops: CARD_CHART_STYLE.fillStops,
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
