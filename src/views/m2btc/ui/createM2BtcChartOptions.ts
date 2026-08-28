import type { ApexOptions } from "apexcharts";
import { BITCOIN_COLOR } from "@/shared/config/color";

export const US_M2_COLOR = "#2563EB";

/**
 * 다크 모드에서 쓸 US M2 색.
 *
 * `US_M2_COLOR` 는 어두운 배경에서 대비를 못 채워 11px 라벨이 안 읽힘.
 * 글자만 밝히면 같은 카드 안에 파랑이 두 종류로 보여서 선·축·점·글자를
 * 다 같이 바꿈. 대응이 어긋나면 범례가 거짓말을 함.
 */
const US_M2_COLOR_DARK = "#60A5FA";

/** 테마에 맞는 US M2 색을 돌려준다. */
export function resolveUsM2Color(isDark: boolean): string {
  return isDark ? US_M2_COLOR_DARK : US_M2_COLOR;
}

const BITCOIN_AXIS_TICK_COUNT = 6;
const Y_AXIS_LABEL_OFFSET_X = 16;
const M2_AXIS_PADDING_RATIO = 0.08;
const LOG_AXIS_PADDING_RATIO = 0.04;

export interface BitcoinLogAxisRange {
  min: number;
  max: number;
}

interface M2AxisRange {
  min: number;
  max: number;
}

interface CreateM2BtcChartOptionsParams {
  bitcoinLogAxisRange: BitcoinLogAxisRange;
  firstMonthTimestamp?: number;
  isDark: boolean;
  lastMonthTimestamp?: number;
  usM2ValuesInBillionsUsd: number[];
}

// region [Privates]
const bitcoinPriceFormatter = new Intl.NumberFormat("en-US", {
  maximumFractionDigits: 2,
});

const compactBitcoinPriceFormatter = new Intl.NumberFormat("en-US", {
  maximumFractionDigits: 1,
  notation: "compact",
});

function resolveM2AxisRange(valuesInBillionsUsd: number[]): M2AxisRange {
  if (valuesInBillionsUsd.length === 0) {
    return { min: 0, max: 1 };
  }

  const minimumValueInBillionsUsd = Math.min(...valuesInBillionsUsd);
  const maximumValueInBillionsUsd = Math.max(...valuesInBillionsUsd);
  const valueRangeInBillionsUsd = maximumValueInBillionsUsd - minimumValueInBillionsUsd;
  const paddingInBillionsUsd = Math.max(
    valueRangeInBillionsUsd * M2_AXIS_PADDING_RATIO,
    maximumValueInBillionsUsd * 0.01,
  );

  return {
    min: Math.max(0, minimumValueInBillionsUsd - paddingInBillionsUsd),
    max: maximumValueInBillionsUsd + paddingInBillionsUsd,
  };
}

function formatTooltipMonth(timestamp: string | number): string {
  const date = new Date(Number(timestamp));

  return `${date.getUTCFullYear()}년 ${date.getUTCMonth() + 1}월`;
}

function resolveAxisLabelColor(isDark: boolean): string {
  return isDark ? "rgba(255,255,255,0.55)" : "rgba(0,0,0,0.5)";
}

function formatBitcoinAxisPriceInUsd(logPrice: number): string {
  const bitcoinPriceInUsd = fromBitcoinLogSpace(logPrice);

  if (bitcoinPriceInUsd < 1) {
    return `$${bitcoinPriceInUsd.toFixed(2)}`;
  }

  if (bitcoinPriceInUsd < 1_000) {
    return `$${bitcoinPriceInUsd.toFixed(bitcoinPriceInUsd < 10 ? 1 : 0)}`;
  }

  return `$${compactBitcoinPriceFormatter.format(bitcoinPriceInUsd)}`;
}

function createYearAxisFormatter(lastMonthTimestamp?: number) {
  return (_value: string, timestamp?: number): string => {
    if (timestamp === undefined) {
      return lastMonthTimestamp === undefined
        ? ""
        : String(new Date(lastMonthTimestamp).getUTCFullYear());
    }

    if (lastMonthTimestamp !== undefined && timestamp > lastMonthTimestamp) {
      return String(new Date(lastMonthTimestamp).getUTCFullYear());
    }

    return String(new Date(timestamp).getUTCFullYear());
  };
}
// endregion

/** 실제 BTC 가격을 로그 공간 값으로 변환한다. */
export function toBitcoinLogSpace(bitcoinPriceInUsd: number): number {
  return Math.log10(bitcoinPriceInUsd);
}

/** 로그 공간 값을 실제 BTC 달러 가격으로 복원한다. */
export function fromBitcoinLogSpace(logPrice: number): number {
  return 10 ** logPrice;
}

/** BTC 전체 가격 범위를 여백이 포함된 로그 축 범위로 계산한다. */
export function resolveBitcoinLogAxisRange(bitcoinPricesInUsd: number[]): BitcoinLogAxisRange {
  if (bitcoinPricesInUsd.length === 0) {
    return { min: 0, max: 1 };
  }

  const logPrices = bitcoinPricesInUsd.map(toBitcoinLogSpace);
  const minimumLogPrice = Math.min(...logPrices);
  const maximumLogPrice = Math.max(...logPrices);
  const logPriceRange = maximumLogPrice - minimumLogPrice;
  const padding = Math.max(logPriceRange * LOG_AXIS_PADDING_RATIO, 0.08);

  return {
    min: minimumLogPrice - padding,
    max: maximumLogPrice + padding,
  };
}

/** BTC 달러 가격을 툴팁과 요약 영역에 표시할 문자열로 변환한다. */
export function formatBitcoinPriceInUsd(bitcoinPriceInUsd: number): string {
  return `$${bitcoinPriceFormatter.format(bitcoinPriceInUsd)}`;
}

/** 미국 M2를 조 달러 단위 문자열로 변환한다. */
export function formatUsM2InTrillionsUsd(valueInBillionsUsd: number): string {
  return `$${(valueInBillionsUsd / 1_000).toFixed(2)}T`;
}

/** 미발표 월을 구분해 미국 M2 툴팁 값을 표시한다. */
export function formatUsM2TooltipValue(valueInBillionsUsd: number | null): string {
  if (valueInBillionsUsd === null) {
    return "발표 전";
  }

  return formatUsM2InTrillionsUsd(valueInBillionsUsd);
}

/** `YYYY-MM` 월 키를 한국어 표시 날짜로 변환한다. */
export function formatMonthKey(monthKey: string): string {
  const [year, month] = monthKey.split("-");

  return `${year}년 ${Number(month)}월`;
}

/** 미국 M2와 BTC 이중 축 차트의 ApexCharts 옵션을 생성한다. */
export function createM2BtcChartOptions({
  bitcoinLogAxisRange,
  firstMonthTimestamp,
  isDark,
  lastMonthTimestamp,
  usM2ValuesInBillionsUsd,
}: CreateM2BtcChartOptionsParams): ApexOptions {
  const hasUsM2Data = usM2ValuesInBillionsUsd.length > 0;
  const usM2Color = resolveUsM2Color(isDark);
  const m2AxisRange = resolveM2AxisRange(usM2ValuesInBillionsUsd);
  const axisLabelColor = resolveAxisLabelColor(isDark);

  return {
    chart: {
      type: "line",
      animations: { enabled: false },
      background: "transparent",
      parentHeightOffset: 0,
      toolbar: { show: false },
      zoom: { enabled: false },
    },
    colors: [BITCOIN_COLOR, usM2Color],
    dataLabels: { enabled: false },
    grid: {
      borderColor: isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.07)",
      padding: { bottom: -16, left: -4, right: -4, top: -16 },
      strokeDashArray: 3,
      xaxis: { lines: { show: false } },
      yaxis: { lines: { show: true } },
    },
    // 범례는 도메인과 한 줄에 놓으려고 M2BtcChart 에서 직접 그림.
    legend: { show: false },
    markers: {
      hover: { size: 4, sizeOffset: 0 },
      size: 0,
    },
    noData: {
      text: "표시할 데이터가 없어요.",
      style: { color: axisLabelColor, fontFamily: "Pretendard", fontSize: "13px" },
    },
    stroke: {
      curve: "straight",
      width: [2.2, 2],
    },
    theme: { mode: isDark ? "dark" : "light" },
    tooltip: {
      hideEmptySeries: true,
      intersect: false,
      marker: { show: true },
      shared: true,
      style: { fontFamily: "Roboto Mono, Pretendard", fontSize: "12px" },
      theme: isDark ? "dark" : "light",
      x: { formatter: formatTooltipMonth },
      y: [
        {
          formatter: (logPrice: number) => {
            return formatBitcoinPriceInUsd(fromBitcoinLogSpace(logPrice));
          },
          title: { formatter: () => "BTC: " },
        },
        {
          formatter: formatUsM2TooltipValue,
          title: { formatter: () => "US M2: " },
        },
      ],
    },
    xaxis: {
      axisBorder: { show: false },
      axisTicks: { show: false },
      crosshairs: {
        stroke: {
          color: isDark ? "rgba(255,255,255,0.35)" : "rgba(0,0,0,0.3)",
          dashArray: 3,
          width: 1,
        },
      },
      labels: {
        datetimeUTC: true,
        formatter: createYearAxisFormatter(lastMonthTimestamp),
        hideOverlappingLabels: false,
        rotate: -45,
        rotateAlways: true,
        style: {
          colors: axisLabelColor,
          fontFamily: "Roboto Mono",
          fontSize: "10px",
        },
      },
      max: lastMonthTimestamp,
      min: firstMonthTimestamp,
      tickAmount: 5,
      tooltip: { enabled: false },
      type: "datetime",
    },
    yaxis: [
      {
        decimalsInFloat: 2,
        forceNiceScale: false,
        labels: {
          formatter: formatBitcoinAxisPriceInUsd,
          offsetX: -Y_AXIS_LABEL_OFFSET_X,
          style: {
            colors: BITCOIN_COLOR,
            fontFamily: "Roboto Mono",
            fontSize: "10px",
          },
        },
        max: bitcoinLogAxisRange.max,
        min: bitcoinLogAxisRange.min,
        seriesName: "BTC",
        tickAmount: BITCOIN_AXIS_TICK_COUNT,
      },
      ...(hasUsM2Data
        ? [
            {
              decimalsInFloat: 1,
              forceNiceScale: false,
              labels: {
                formatter: (valueInBillionsUsd: number) => {
                  return `$${(valueInBillionsUsd / 1_000).toFixed(1)}T`;
                },
                offsetX: -Y_AXIS_LABEL_OFFSET_X,
                style: {
                  colors: usM2Color,
                  fontFamily: "Roboto Mono",
                  fontSize: "10px",
                },
              },
              max: m2AxisRange.max,
              min: m2AxisRange.min,
              opposite: true,
              seriesName: "US M2",
              tickAmount: 5,
            },
          ]
        : []),
    ],
  };
}
