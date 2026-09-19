import type { ApexOptions } from "apexcharts";
import { BITCOIN_COLOR } from "@/shared/config/color";
import type { ChartSeriesPoint } from "./OverviewChartShell.interface";

export interface CreateChartOptionsParams {
  isDark: boolean;
  formatter: (val: number) => string;
  maxPoint: ChartSeriesPoint | null;
  maxPointRatio: number;
  lastPoint: ChartSeriesPoint | null;
}

/**
 * 공유 카드( `BtcSurgeShareCard` ) 차트와 같은 시각 언어를 쓰기 위한 값.
 *
 * 굵은 라운드 곡선 + 바닥으로 사라지는 그라데이션 + 종점 펄스가 한 벌이라
 * 차트별로 다르게 주지 않고 여기서 한 곳에 모아 둔다.
 * 글로우( 곡선 번짐 )와 펄스 애니메이션은 `globals.css` 의 `.overview-chart-*` 가 담당.
 */
const CARD_CHART_STYLE = {
  strokeWidth: 3,
  fillOpacityFrom: 0.4,
  fillStops: [0, 100] as [number, number],
  /** 종점에서 퍼져 나가는 펄스 원 */
  pulseMarkerSize: 7,
  /** 펄스 중앙에 찍히는 흰 점 */
  endMarkerSize: 4,
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
 * 시계열 마지막 지점에 찍는 펄스 마커.
 * 퍼지는 원과 흰 점을 따로 그려야 `animate-ping` 같은 확산 효과를 줄 수 있다.
 */
const createEndPointAnnotations = (lastPoint: ChartSeriesPoint | null) => {
  if (!lastPoint) return [];

  return [
    {
      x: lastPoint.x,
      y: lastPoint.y,
      marker: {
        size: CARD_CHART_STYLE.pulseMarkerSize,
        fillColor: BITCOIN_COLOR,
        strokeColor: "transparent",
        strokeWidth: 0,
        cssClass: "overview-chart-pulse",
      },
      label: { text: "" },
    },
    {
      x: lastPoint.x,
      y: lastPoint.y,
      marker: {
        size: CARD_CHART_STYLE.endMarkerSize,
        fillColor: "#fff",
        strokeColor: BITCOIN_COLOR,
        strokeWidth: 2,
        cssClass: "",
      },
      label: { text: "" },
    },
  ];
};

/**
 * 두 차트(Market/MiningMetric)가 공유하는 ApexOptions 객체 생성
 */
export const createChartOptions = ({
  isDark,
  formatter,
  maxPoint,
  maxPointRatio,
  lastPoint,
}: CreateChartOptionsParams): ApexOptions => {
  /** 최고점이 곧 마지막 지점이면 마커가 겹치므로 라벨만 남긴다. */
  const isMaxPointAtEnd = Boolean(maxPoint && lastPoint && maxPoint.x === lastPoint.x);

  return {
    chart: {
      type: "area",
      toolbar: { show: false },
      zoom: { enabled: false },
      background: "transparent",
      animations: { enabled: false },
    },
    theme: { mode: isDark ? "dark" : "light" },
    colors: [BITCOIN_COLOR],
    stroke: { curve: "smooth", width: CARD_CHART_STYLE.strokeWidth, lineCap: "round" },
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
    /*
      카드 차트처럼 곡선만 남긴다. y축 라벨이 없어 격자선이 읽을 값을 주지 못하는 데다,
      글로우와 겹치면 지저분해진다. 좌우 여백은 종점 펄스가 잘리지 않을 만큼만 둔다.
    */
    grid: {
      show: false,
      padding: { left: 0, right: 8, top: 8, bottom: 0 },
    },
    dataLabels: { enabled: false },
    annotations: {
      yaxis: [],
      xaxis: [],
      texts: [],
      images: [],
      shapes: [],
      points: [
        ...(maxPoint
          ? [
              {
                x: maxPoint.x,
                y: maxPoint.y,
                marker: {
                  size: isMaxPointAtEnd ? 0 : 4,
                  fillColor: BITCOIN_COLOR,
                  strokeColor: "#fff",
                  strokeWidth: 2,
                  cssClass: "",
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
          : []),
        ...createEndPointAnnotations(lastPoint),
      ],
    } as unknown as ApexOptions["annotations"],
  };
};
