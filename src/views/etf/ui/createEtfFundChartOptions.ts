import type { ApexOptions } from "apexcharts";
import type { BitcoinEtfFundSnapshot } from "@/entities/etf";
import {
  formatEtfAumInUsd,
  formatEtfHoldingsInBtc,
  formatSignedEtfFlowInUsd,
} from "../lib/formatEtf";

const BITCOIN_CHART_COLOR = "#f7931a";
const UP_FLOW_COLOR = "#22c55e";
const DOWN_FLOW_COLOR = "#ef4444";
const EXCLUDED_FLOW_COLOR = "#f59e0b";
const AXIS_PADDING_RATIO = 1.08;

export type EtfFundMetric = "aum" | "holdings" | "flow";

export interface CreateEtfFundChartOptionsParams {
  funds: BitcoinEtfFundSnapshot[];
  isDark: boolean;
  selectedMetric: EtfFundMetric;
}

interface MetricAxisRange {
  min: number;
  max: number;
}

// region [Privates]
export const resolveEtfFundMetricValue = (
  fund: BitcoinEtfFundSnapshot,
  selectedMetric: EtfFundMetric,
): number => {
  if (selectedMetric === "aum") {
    return fund.estimatedAumInUsd ?? 0;
  }

  if (selectedMetric === "holdings") {
    return fund.holdingsInBtc ?? 0;
  }

  return fund.estimatedFlowInUsd ?? 0;
};

const resolveMetricAxisRange = (
  funds: BitcoinEtfFundSnapshot[],
  selectedMetric: EtfFundMetric,
): MetricAxisRange => {
  const metricValues = funds.map((fund) => resolveEtfFundMetricValue(fund, selectedMetric));
  const maximumPositiveValue = Math.max(...metricValues.filter((value) => value > 0), 0);
  const minimumNegativeValue = Math.min(...metricValues.filter((value) => value < 0), 0);

  if (minimumNegativeValue < 0 && maximumPositiveValue > 0) {
    return {
      min: minimumNegativeValue * AXIS_PADDING_RATIO,
      max: maximumPositiveValue * AXIS_PADDING_RATIO,
    };
  }

  if (minimumNegativeValue < 0) {
    return { min: minimumNegativeValue * AXIS_PADDING_RATIO, max: 0 };
  }

  return { min: 0, max: Math.max(maximumPositiveValue * AXIS_PADDING_RATIO, 1) };
};

const formatMetricValue = (value: number, selectedMetric: EtfFundMetric): string => {
  if (selectedMetric === "aum") {
    return formatEtfAumInUsd(value);
  }

  if (selectedMetric === "holdings") {
    return formatEtfHoldingsInBtc(value);
  }

  return formatSignedEtfFlowInUsd(value);
};

export const resolveEtfFundBarColor = (
  fund: BitcoinEtfFundSnapshot,
  selectedMetric: EtfFundMetric,
): string => {
  if (selectedMetric !== "flow") {
    return BITCOIN_CHART_COLOR;
  }

  if (fund.isEstimatedFlowExcluded) {
    return EXCLUDED_FLOW_COLOR;
  }

  return (fund.estimatedFlowInUsd ?? 0) >= 0 ? UP_FLOW_COLOR : DOWN_FLOW_COLOR;
};
// endregion

/** ETF별 선택 지표를 비교하는 ApexCharts 가로 막대 옵션을 생성한다. */
export const createEtfFundChartOptions = ({
  funds,
  isDark,
  selectedMetric,
}: CreateEtfFundChartOptionsParams): ApexOptions => {
  const metricAxisRange = resolveMetricAxisRange(funds, selectedMetric);

  return {
    chart: {
      type: "bar",
      toolbar: { show: false },
      zoom: { enabled: false },
      background: "transparent",
      animations: { enabled: false },
      parentHeightOffset: 0,
    },
    theme: { mode: isDark ? "dark" : "light" },
    plotOptions: {
      bar: {
        horizontal: true,
        borderRadius: 4,
        borderRadiusApplication: "end",
        barHeight: "58%",
        dataLabels: { position: "top" },
      },
    },
    fill: { opacity: 1 },
    stroke: { width: 0 },
    states: {
      hover: { filter: { type: "lighten" } },
      active: { filter: { type: "none" } },
    },
    dataLabels: {
      enabled: true,
      offsetX: 8,
      textAnchor: "start",
      style: {
        colors: [isDark ? "#e4e4e7" : "#52525b"],
        fontSize: "11px",
        fontFamily: "Roboto Mono",
        fontWeight: 700,
      },
      background: { enabled: false },
      formatter: (value: number) => formatMetricValue(value, selectedMetric),
    },
    tooltip: {
      theme: isDark ? "dark" : "light",
      shared: false,
      intersect: true,
      fixed: { enabled: true, position: "bottomRight", offsetY: -8, offsetX: -8 },
      y: { formatter: (value: number) => formatMetricValue(value, selectedMetric) },
      marker: { show: false },
      style: { fontSize: "12px", fontFamily: "Roboto Mono" },
    },
    xaxis: {
      min: metricAxisRange.min,
      max: metricAxisRange.max,
      labels: { show: false },
      axisBorder: { show: false },
      axisTicks: { show: false },
      tooltip: { enabled: false },
    },
    yaxis: {
      labels: {
        show: true,
        maxWidth: 58,
        style: {
          colors: isDark ? "#e4e4e7" : "#3f3f46",
          fontSize: "11px",
          fontFamily: "Roboto Mono",
          fontWeight: 700,
        },
      },
    },
    grid: {
      borderColor: isDark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.06)",
      strokeDashArray: 3,
      xaxis: { lines: { show: false } },
      yaxis: { lines: { show: false } },
      padding: { left: 12, right: 48, top: -16, bottom: -16 },
    },
    legend: { show: false },
  };
};

export { BITCOIN_CHART_COLOR, DOWN_FLOW_COLOR, EXCLUDED_FLOW_COLOR, UP_FLOW_COLOR };
