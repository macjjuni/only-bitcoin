import type { ApexOptions } from "apexcharts";
import { BITCOIN_COLOR } from "@/shared/config/color";
import { formatSignedEtfFlowInUsd } from "../lib/formatEtf";

export const CUMULATIVE_FLOW_COLOR = "#2563EB";
/** `CUMULATIVE_FLOW_COLOR` 는 어두운 배경에서 대비가 약해서 다크 모드는 밝은 파랑을 씀. */
const CUMULATIVE_FLOW_COLOR_DARK = "#60A5FA";
const CHART_TICK_AMOUNT = 4;

export interface CreateEtfCumulativeChartOptionsParams {
  firstTimestamp: number | undefined;
  lastTimestamp: number | undefined;
  isDark: boolean;
}

// region [Privates]
const formatCompactUsd = (valueInUsd: number): string => {
  const absolute = Math.abs(valueInUsd);
  const sign = valueInUsd < 0 ? "−" : "";

  if (absolute >= 1e9) return `${sign}$${Math.round(absolute / 1e9)}B`;
  if (absolute >= 1e6) return `${sign}$${Math.round(absolute / 1e6)}M`;
  if (absolute >= 1e3) return `${sign}$${Math.round(absolute / 1e3)}K`;
  return `${sign}$${Math.round(absolute)}`;
};

const formatBitcoinPrice = (priceInUsd: number): string => {
  return `$${Math.round(priceInUsd).toLocaleString("en-US")}`;
};

const formatDateLabel = (timestamp: number): string => {
  const date = new Date(timestamp);
  const year = String(date.getFullYear()).slice(-2);
  const month = String(date.getMonth() + 1).padStart(2, "0");

  return `${year}.${month}`;
};

const formatTooltipDate = (timestamp: number): string => {
  const date = new Date(timestamp);
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${date.getFullYear()}.${month}.${day}`;
};
// endregion

export const resolveCumulativeFlowColor = (isDark: boolean): string => {
  return isDark ? CUMULATIVE_FLOW_COLOR_DARK : CUMULATIVE_FLOW_COLOR;
};

/**
 * 누적 순유입( 왼쪽 축 · 면 )과 BTC 가격( 오른쪽 축 · 선 )을 겹쳐 그리는 옵션.
 * 시리즈 순서는 [누적 순유입, BTC 가격] 이어야 축과 색이 맞음.
 */
export const createEtfCumulativeChartOptions = ({
  firstTimestamp,
  lastTimestamp,
  isDark,
}: CreateEtfCumulativeChartOptionsParams): ApexOptions => {
  const cumulativeFlowColor = resolveCumulativeFlowColor(isDark);
  const axisLabelColor = isDark ? "rgba(255,255,255,0.5)" : "rgba(0,0,0,0.45)";

  return {
    chart: {
      type: "line",
      toolbar: { show: false },
      zoom: { enabled: false },
      background: "transparent",
      animations: { enabled: false },
      parentHeightOffset: 0,
    },
    theme: { mode: isDark ? "dark" : "light" },
    colors: [cumulativeFlowColor, BITCOIN_COLOR],
    stroke: { width: [2, 2], curve: "straight" },
    fill: {
      type: ["gradient", "solid"],
      gradient: { shadeIntensity: 0, opacityFrom: 0.35, opacityTo: 0.02, stops: [0, 100] },
    },
    dataLabels: { enabled: false },
    markers: { size: 0, hover: { size: 4 } },
    tooltip: {
      theme: isDark ? "dark" : "light",
      shared: true,
      intersect: false,
      x: { formatter: (value: number) => formatTooltipDate(value) },
      y: [
        { formatter: (value: number) => formatSignedEtfFlowInUsd(value) },
        { formatter: (value: number) => (value ? formatBitcoinPrice(value) : "-") },
      ],
      style: { fontSize: "12px", fontFamily: "Roboto Mono" },
    },
    xaxis: {
      type: "numeric",
      min: firstTimestamp,
      max: lastTimestamp,
      tickAmount: CHART_TICK_AMOUNT,
      labels: {
        formatter: (value: string) => formatDateLabel(Number(value)),
        style: { colors: axisLabelColor, fontSize: "11px", fontFamily: "Roboto Mono" },
      },
      axisBorder: { show: false },
      axisTicks: { show: false },
      tooltip: { enabled: false },
    },
    yaxis: [
      {
        seriesName: "누적 순유입",
        tickAmount: CHART_TICK_AMOUNT,
        labels: {
          formatter: (value: number) => formatCompactUsd(value),
          style: { colors: cumulativeFlowColor, fontSize: "11px", fontFamily: "Roboto Mono" },
          offsetX: -12,
        },
      },
      {
        seriesName: "BTC 가격",
        opposite: true,
        tickAmount: CHART_TICK_AMOUNT,
        labels: {
          formatter: (value: number) => formatCompactUsd(value),
          style: { colors: BITCOIN_COLOR, fontSize: "11px", fontFamily: "Roboto Mono" },
          offsetX: -12,
        },
      },
    ],
    grid: {
      borderColor: isDark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.06)",
      strokeDashArray: 3,
      xaxis: { lines: { show: false } },
      padding: { left: 0, right: 0, top: -12, bottom: 0 },
    },
    legend: { show: false },
  };
};
