import type { ApexOptions } from "apexcharts";
import { formatSignedEtfFlowInUsd } from "../lib/formatEtf";

const UP_FLOW_COLOR = "#22c55e";
const DOWN_FLOW_COLOR = "#ef4444";
const CHART_TICK_AMOUNT = 4;
const AXIS_PADDING_RATIO = 1.08;
const X_AXIS_LABEL_PADDING_IN_PIXELS = 28;

export interface EtfFlowChartOptionPoint {
  date: string;
  estimatedNetFlowInUsd: number;
}

export interface CreateEtfFlowChartOptionsParams {
  dailyFlows: EtfFlowChartOptionPoint[];
  isDark: boolean;
  isFullHistory: boolean;
}

interface FlowAxisRange {
  min: number;
  max: number;
}

interface DateAxisRange {
  min: number | undefined;
  max: number | undefined;
}

// region [Privates]
const formatDateAxisLabel = (timestamp: number, isFullHistory: boolean): string => {
  const date = new Date(timestamp);
  const month = date.getMonth() + 1;
  const day = date.getDate();

  if (!isFullHistory) {
    return `${month}/${day}`;
  }

  const year = String(date.getFullYear()).slice(-2);
  return `${year}.${String(month).padStart(2, "0")}.${String(day).padStart(2, "0")}`;
};

const formatTooltipDate = (timestamp: number): string => {
  const date = new Date(timestamp);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}.${month}.${day}`;
};

const resolveDateAxisRange = (dailyFlows: EtfFlowChartOptionPoint[]): DateAxisRange => {
  const firstDailyFlow = dailyFlows.at(0);
  const lastDailyFlow = dailyFlows.at(-1);

  return {
    min: firstDailyFlow ? new Date(`${firstDailyFlow.date}T00:00:00`).getTime() : undefined,
    max: lastDailyFlow ? new Date(`${lastDailyFlow.date}T00:00:00`).getTime() : undefined,
  };
};

const resolveFlowAxisRange = (dailyFlows: EtfFlowChartOptionPoint[]): FlowAxisRange => {
  const maximumPositiveFlowInUsd = Math.max(
    ...dailyFlows
      .map(({ estimatedNetFlowInUsd }) => estimatedNetFlowInUsd)
      .filter((flowInUsd) => flowInUsd > 0),
    0,
  );
  const maximumNegativeFlowInUsd = Math.min(
    ...dailyFlows
      .map(({ estimatedNetFlowInUsd }) => estimatedNetFlowInUsd)
      .filter((flowInUsd) => flowInUsd < 0),
    0,
  );
  const hasPositiveFlow = maximumPositiveFlowInUsd > 0;
  const hasNegativeFlow = maximumNegativeFlowInUsd < 0;

  if (hasPositiveFlow && hasNegativeFlow) {
    return {
      min: maximumNegativeFlowInUsd * AXIS_PADDING_RATIO,
      max: maximumPositiveFlowInUsd * AXIS_PADDING_RATIO,
    };
  }

  if (hasNegativeFlow) {
    return {
      min: maximumNegativeFlowInUsd * AXIS_PADDING_RATIO,
      max: 0,
    };
  }

  return {
    min: 0,
    max: Math.max(maximumPositiveFlowInUsd * AXIS_PADDING_RATIO, 1),
  };
};
// endregion

/** ETF 순유입에 사용하는 ApexCharts column 옵션을 생성한다. */
export const createEtfFlowChartOptions = ({
  dailyFlows,
  isDark,
  isFullHistory,
}: CreateEtfFlowChartOptionsParams): ApexOptions => {
  const dateAxisRange = resolveDateAxisRange(dailyFlows);
  const flowAxisRange = resolveFlowAxisRange(dailyFlows);

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
        borderRadius: 3,
        borderRadiusApplication: "end",
        columnWidth: dailyFlows.length > 300 ? "85%" : "65%",
      },
    },
    colors: [UP_FLOW_COLOR],
    fill: { opacity: 1 },
    stroke: { width: 0 },
    states: {
      hover: { filter: { type: "lighten" } },
      active: { filter: { type: "none" } },
    },
    dataLabels: { enabled: false },
    tooltip: {
      theme: isDark ? "dark" : "light",
      shared: false,
      intersect: true,
      x: { formatter: (value: number) => formatTooltipDate(value) },
      y: { formatter: (value: number) => formatSignedEtfFlowInUsd(value) },
      marker: { show: false },
      style: { fontSize: "12px", fontFamily: "Roboto Mono" },
    },
    xaxis: {
      type: "numeric",
      min: dateAxisRange.min,
      max: dateAxisRange.max,
      tickAmount: CHART_TICK_AMOUNT,
      labels: {
        show: true,
        formatter: (value: string) => formatDateAxisLabel(Number(value), isFullHistory),
        hideOverlappingLabels: false,
        trim: false,
        style: {
          colors: isDark ? "rgba(255,255,255,0.5)" : "rgba(0,0,0,0.45)",
          fontSize: "11px",
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
      min: flowAxisRange.min,
      max: flowAxisRange.max,
      forceNiceScale: false,
    },
    annotations: {
      yaxis: [
        {
          y: 0,
          borderColor: isDark ? "rgba(255,255,255,0.28)" : "rgba(0,0,0,0.18)",
          strokeDashArray: 0,
        },
      ],
    },
    grid: {
      borderColor: isDark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.06)",
      strokeDashArray: 3,
      xaxis: { lines: { show: false } },
      yaxis: { lines: { show: false } },
      padding: {
        left: X_AXIS_LABEL_PADDING_IN_PIXELS,
        right: X_AXIS_LABEL_PADDING_IN_PIXELS,
        top: 0,
        bottom: 0,
      },
    },
    legend: { show: false },
  };
};

export { DOWN_FLOW_COLOR, UP_FLOW_COLOR };
