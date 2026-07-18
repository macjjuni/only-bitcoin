import type { ApexOptions } from "apexcharts";
import { formatBtc } from "../lib/format";

const BITCOIN_COLOR = "#f7931a";

export interface CreateHoldingsChartOptionsParams {
  isDark: boolean;
  targetBtcCount: number;
  maxHoldingBtcCount: number;
}

/**
 * DCA 누적 보유량 차트의 ApexOptions 객체 생성.
 *
 * - 매수/매도 시점을 잇는 부드러운 곡선으로 보유량 추이를 그린다.
 * - 목표 보유 개수를 점선 annotation으로 표시하고,
 *   y축 범위에 목표를 포함해 목표 대비 진행 정도가 보이도록 한다.
 */
export const createHoldingsChartOptions = ({
  isDark,
  targetBtcCount,
  maxHoldingBtcCount,
}: CreateHoldingsChartOptionsParams): ApexOptions => ({
  chart: {
    type: "area",
    toolbar: { show: false },
    zoom: { enabled: false },
    background: "transparent",
    animations: { enabled: false },
  },
  theme: { mode: isDark ? "dark" : "light" },
  colors: [BITCOIN_COLOR],
  stroke: { curve: "straight", width: 2 },
  fill: {
    type: "gradient",
    colors: [BITCOIN_COLOR],
    gradient: {
      shadeIntensity: 1,
      opacityFrom: isDark ? 0.66 : 0.7,
      opacityTo: isDark ? 0.06 : 0.1,
      stops: [0, 100],
    },
  },
  markers: {
    size: 3,
    colors: [BITCOIN_COLOR],
    strokeColors: isDark ? "#121212" : "#fff",
    strokeWidth: 1.5,
    hover: { size: 5, sizeOffset: 0 },
  },
  tooltip: {
    theme: isDark ? "dark" : "light",
    x: {
      show: true,
      format: "yyyy.MM.dd",
    },
    y: { formatter: (val: number) => `₿ ${formatBtc(val)}` },
    marker: { show: false },
    style: { fontSize: "12px", fontFamily: "Roboto Mono" },
  },
  xaxis: {
    type: "datetime",
    labels: {
      show: true,
      // 로컬 자정 기준 timestamp라 UTC로 표시하면 KST에서 하루 밀린다.
      datetimeUTC: false,
      format: "yy.MM.dd",
      style: {
        colors: isDark ? "rgba(255,255,255,0.5)" : "rgba(0,0,0,0.45)",
        fontSize: "10px",
        fontFamily: "Roboto Mono",
      },
    },
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
  yaxis: {
    show: false,
    min: 0,
    max: Math.max(targetBtcCount, maxHoldingBtcCount) * 1.15,
  },
  grid: {
    borderColor: isDark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.06)",
    strokeDashArray: 3,
    xaxis: { lines: { show: false } },
    yaxis: { lines: { show: true } },
    padding: { left: 4, right: 8, top: -10, bottom: 0 },
  },
  dataLabels: { enabled: false },
  annotations: {
    yaxis: [
      {
        y: targetBtcCount,
        borderColor: isDark ? "rgba(255,255,255,0.5)" : "rgba(0,0,0,0.45)",
        strokeDashArray: 4,
        label: {
          text: `목표 ₿ ${formatBtc(targetBtcCount)}`,
          position: "left",
          textAnchor: "start",
          offsetY: -6,
          borderWidth: 0,
          style: {
            background: "transparent",
            color: isDark ? "rgba(255,255,255,0.7)" : "rgba(0,0,0,0.6)",
            fontSize: "11px",
            fontWeight: 600,
            fontFamily: "Roboto Mono",
          },
        },
      },
    ],
  },
});
