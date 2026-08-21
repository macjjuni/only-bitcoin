import type { ApexOptions } from "apexcharts";
import type { PriceUnit } from "@/entities/apartment";
import { BITCOIN_COLOR } from "@/shared/config/color";
import { formatBtcCount, formatKrwInEok, isLowSampleYear } from "../lib/buildChartSeries";

const KRW_COLOR_DARK = "#9ca3af";
const KRW_COLOR_LIGHT = "#6b7280";

/**
 * 진행 중인 연도 막대는 흐리게 그려 확정 데이터와 구분한다.
 *
 * ApexCharts 의 `fill.opacity` 배열은 **시리즈 단위**라 데이터포인트마다 다르게 줄 수 없다.
 * 막대 하나만 흐리게 하려면 데이터를 `{ x, y, fillColor }` 형태로 넘겨야 한다.
 */
const PARTIAL_YEAR_ALPHA = "73";

/** 선택 단위에 따른 막대 색 */
export function resolveSeriesColor(priceUnit: PriceUnit, isDark: boolean): string {
  if (priceUnit === "BTC") {
    return BITCOIN_COLOR;
  }

  return isDark ? KRW_COLOR_DARK : KRW_COLOR_LIGHT;
}

/** 진행 중인 연도용 반투명 색 ( 8자리 hex 의 알파 채널 ) */
export function resolvePartialYearColor(priceUnit: PriceUnit, isDark: boolean): string {
  return `${resolveSeriesColor(priceUnit, isDark)}${PARTIAL_YEAR_ALPHA}`;
}

/**
 * 로그 축으로 전환하는 값 범위 배수.
 *
 * 계획 단계에서는 "2014년 시작이면 편차가 90배라 선형으로 읽힌다" 고 봤으나 실측이 반박했다.
 * 잠실엘스 84㎡ 는 2015년 약 3,400 BTC → 2026년 21 BTC 로 **160배**다.
 * 선형 축에서는 2018년 이후 막대가 전부 바닥에 붙어 "계속 싸졌다" 는 추세 자체가 안 보인다.
 */
const LOG_SCALE_RATIO_THRESHOLD = 50;

/** 값 범위가 커서 로그 축이 필요한지 판단한다. */
export function shouldUseLogScale(values: Array<number | null>): boolean {
  const positiveValues = values.filter((value): value is number => value !== null && value > 0);

  if (positiveValues.length < 2) {
    return false;
  }

  return Math.max(...positiveValues) / Math.min(...positiveValues) >= LOG_SCALE_RATIO_THRESHOLD;
}

/** 축 · 범례 라벨 공통 타이포 */
const resolveAxisLabelStyle = (isDark: boolean) => ({
  fontSize: "11px",
  fontFamily: "Roboto Mono",
  colors: isDark ? "#a1a1aa" : "#71717a",
});

/** 연도 축. 진행 중인 연도는 `*` 로 확정 데이터와 구분함. */
const createYearAxis = (
  years: number[],
  partialYearFlags: boolean[],
  isDark: boolean,
): ApexOptions["xaxis"] => ({
  categories: years.map((year, index) => (partialYearFlags[index] ? `${year}*` : String(year))),
  axisBorder: { show: false },
  axisTicks: { show: false },
  labels: {
    rotate: 0,
    hideOverlappingLabels: true,
    style: resolveAxisLabelStyle(isDark),
  },
});

const createGrid = (isDark: boolean): ApexOptions["grid"] => ({
  borderColor: isDark ? "#3f3f46" : "#e5e7eb",
  strokeDashArray: 3,
  xaxis: { lines: { show: false } },
  padding: { left: 4, right: 4, top: 8 },
});

/** 툴팁 머리말( 연도 ). 진행 중인 연도는 어디까지 집계됐는지 함께 알림. */
const createYearTooltipFormatter =
  (years: number[], partialYearFlags: boolean[], settledThroughMonths: number[]) =>
  (_value: string, options?: { dataPointIndex?: number }) => {
    const index = options?.dataPointIndex ?? 0;
    const year = years[index];

    if (partialYearFlags[index]) {
      return `${year}년 · ${settledThroughMonths[index]}월까지 집계 중`;
    }

    return `${year}년`;
  };

/**
 * BTC 시리즈 위치. `colors` · `yaxis` · `stroke.width` 배열 순서와 반드시 같아야 함.
 *
 * KRW( 0 )가 앞인 이유: 뒤 시리즈가 위에 그려지므로 BTC 선이 막대에 가리지 않음.
 */
const BTC_SERIES_INDEX = 1;

/**
 * 로그 축이 필요할 때 **값을 직접 로그로 바꿔** 넘긴다.
 *
 * ApexCharts 의 `yaxis.logarithmic` 은 축이 2개이고 한쪽만 로그일 때 깨진다.
 * ( 로그 시리즈가 0~1 로 정규화된 뒤 반대쪽 선형 축의 비율로 그려져 바닥에 붙는다.
 *   양쪽을 모두 로그로 두면 이번엔 KRW 막대가 전부 천장에 붙는다 )
 * 그래서 축 옵션에 맡기지 않고 값을 log10 으로 바꿔 선형 축에 그린 뒤,
 * 축 라벨과 툴팁에서만 원래 값으로 되돌린다.
 */
export function toLogSpace(value: number | null): number | null {
  return value === null || value <= 0 ? null : Math.log10(value);
}

/** `toLogSpace` 로 바꾼 값을 원래 BTC 개수로 되돌린다. */
export function fromLogSpace(logValue: number): number {
  return 10 ** logValue;
}

export interface LogAxisRange {
  /** 로그 공간의 축 경계 ( = 10의 거듭제곱 지수 ) */
  min: number;
  max: number;
  tickAmount: number;
}

/**
 * 로그 축의 눈금 범위를 10의 거듭제곱 경계로 맞춘다.
 *
 * ApexCharts 에 맡기면 21~3,367 짜리 데이터에 1~10,000 축을 잡아 아래 1/4 가 빈다.
 * 경계를 직접 잡으면 10~10,000 이 되어 선이 축을 꽉 채운다.
 */
export function resolveLogAxisRange(values: Array<number | null>): LogAxisRange {
  const logValues = values
    .map(toLogSpace)
    .filter((logValue): logValue is number => logValue !== null);

  const min = Math.floor(Math.min(...logValues));
  // 최댓값이 정확히 거듭제곱이면 위로 한 칸 더 밀지 않는다. ( 1,000 → 10,000 이 되면 절반이 빈다 )
  const max = Math.max(Math.ceil(Math.max(...logValues)), min + 1);

  return { min, max, tickAmount: max - min };
}

/** 로그 축이 아닐 때의 좌우 공통 눈금 수. 다르면 오른쪽 라벨이 그리드선에서 어긋난다. */
const DEFAULT_TICK_AMOUNT = 4;

/**
 * 눈금 수에 맞춰 딱 떨어지는 KRW 축 최댓값.
 *
 * `forceNiceScale` 에 맡기면 눈금이 3칸일 때 33억짜리 데이터에 60억 축을 잡아
 * 막대가 절반 높이로 눌린다. 억 단위로 올림해 축을 데이터에 붙인다.
 */
export function resolveKrwAxisMax(values: Array<number | null>, tickAmount: number): number {
  const valuesInEok = values
    .filter((value): value is number => value !== null && value > 0)
    .map((value) => value / 100_000_000);

  // 그릴 값이 하나도 없으면 축을 접지 않고 눈금 수만큼의 기본 높이를 준다.
  if (valuesInEok.length === 0) {
    return tickAmount * 100_000_000;
  }

  return Math.ceil(Math.max(...valuesInEok) / tickAmount) * tickAmount * 100_000_000;
}

export interface CreateApartmentChartOptionsParams {
  isDark: boolean;
  years: number[];
  dealCounts: number[];
  partialYearFlags: boolean[];
  settledThroughMonths: number[];
  /**
   * BTC 시리즈가 `toLogSpace` 를 거친 값이면 그 축 범위. `null` 이면 원래 BTC 개수 그대로다.
   * 축 라벨 · 툴팁을 되돌릴지가 여기에 달렸다.
   */
  btcLogRange: LogAxisRange | null;
  /** KRW 시리즈 값. 축 최댓값을 눈금 수에 맞춰 잡는 데 쓴다. */
  krwValues: Array<number | null>;
}

/**
 * BTC · KRW 를 한 차트에 겹쳐 그리는 옵션.
 *
 * 두 단위는 자릿수가 아예 다르므로( 58억 vs 21개 ) 축을 좌우로 나눠 씀.
 * 축이 둘이면 교차점 자체에 의미는 없지만, 이 차트가 말하려는 것은
 * "원화로는 올랐고 BTC 로는 내렸다" 는 **방향의 반대**라 가위 모양만 읽히면 충분함.
 *
 * KRW 는 막대, BTC 는 선으로 형태까지 갈라 놓았음. 같은 형태로 두면 축이 다른 두 값의
 * 높이를 직접 비교하게 되어 없는 의미를 읽게 됨.
 *
 * KRW 축은 로그로 바꾸지 않음. 2014년 이후 원화 중앙값 편차는 어느 단지든 10배 안쪽이라
 * 선형으로 충분하고, 막대는 밑동이 0 이어야 길이 비교가 성립함.
 */
export const createApartmentChartOptions = ({
  isDark,
  years,
  dealCounts,
  partialYearFlags,
  settledThroughMonths,
  btcLogRange,
  krwValues,
}: CreateApartmentChartOptionsParams): ApexOptions => {
  const krwColor = resolveSeriesColor("KRW", isDark);
  const tickAmount = btcLogRange?.tickAmount ?? DEFAULT_TICK_AMOUNT;

  /** 축에 그려진 값( 로그 공간일 수 있다 )을 사람이 읽는 BTC 개수로 되돌린다. */
  const toBtcCount = (value: number) => (btcLogRange ? fromLogSpace(value) : value);

  /** 건수는 두 줄에 반복하지 않고 KRW 줄에만 붙임. 두 시리즈가 같은 거래를 집계한 값이라 같음. */
  const describeDealCount = (dataPointIndex: number) => {
    const dealCount = dealCounts[dataPointIndex] ?? 0;

    return isLowSampleYear(dealCount) ? `${dealCount}건 (표본 부족)` : `${dealCount}건`;
  };

  return {
    chart: {
      // 혼합 차트는 chart.type 이 아니라 시리즈별 type 으로 형태가 갈림.
      type: "line",
      toolbar: { show: false },
      zoom: { enabled: false },
      background: "transparent",
      animations: { enabled: true, speed: 420 },
    },
    theme: { mode: isDark ? "dark" : "light" },
    colors: [krwColor, BITCOIN_COLOR],
    plotOptions: {
      bar: {
        borderRadius: 3,
        borderRadiusApplication: "end",
        columnWidth: years.length <= 5 ? "42%" : "68%",
      },
    },
    stroke: { width: [0, 2.5], curve: "straight" },
    // 막대 시리즈는 마커를 그리지 않으므로 크기를 배열로 나눌 필요가 없다.
    markers: {
      size: 3.5,
      strokeWidth: 0,
      // 진행 중인 연도는 막대와 같은 규칙으로 점도 흐리게 찍음.
      discrete: partialYearFlags.flatMap((isPartialYear, dataPointIndex) =>
        isPartialYear
          ? [
              {
                seriesIndex: BTC_SERIES_INDEX,
                dataPointIndex,
                fillColor: resolvePartialYearColor("BTC", isDark),
                strokeColor: "transparent",
                size: 3.5,
                shape: "circle" as const,
              },
            ]
          : [],
      ),
      hover: { size: 5 },
    },
    states: {
      hover: { filter: { type: "lighten" } },
      active: { filter: { type: "none" } },
    },
    dataLabels: { enabled: false },
    grid: createGrid(isDark),
    tooltip: {
      theme: isDark ? "dark" : "light",
      style: { fontSize: "12px", fontFamily: "Roboto Mono" },
      shared: true,
      intersect: false,
      x: { formatter: createYearTooltipFormatter(years, partialYearFlags, settledThroughMonths) },
      y: [
        {
          formatter: (value, options) =>
            value === null
              ? "거래 없음"
              : `${formatKrwInEok(value)}억 · ${describeDealCount(options?.dataPointIndex ?? 0)}`,
        },
        {
          formatter: (value) =>
            value === null ? "거래 없음" : `₿ ${formatBtcCount(toBtcCount(value))}`,
        },
      ],
    },
    xaxis: createYearAxis(years, partialYearFlags, isDark),
    /** 축 라벨 색을 시리즈 색에 맞춰, 축 제목 없이도 어느 축이 어느 값인지 알아보게 함. */
    yaxis: [
      {
        seriesName: "KRW",
        min: 0,
        max: resolveKrwAxisMax(krwValues, tickAmount),
        // 좌우 눈금 수를 맞춰야 오른쪽 라벨이 왼쪽 그리드선 위에 온다.
        tickAmount,
        labels: {
          formatter: (value: number) => `${formatKrwInEok(value)}억`,
          style: { ...resolveAxisLabelStyle(isDark), colors: krwColor },
        },
      },
      {
        seriesName: "BTC",
        opposite: true,
        // 로그 공간에서는 경계를 직접 잡는다. `forceNiceScale` 은 그 경계를 다시 넓혀 버린다.
        forceNiceScale: !btcLogRange,
        min: btcLogRange?.min,
        max: btcLogRange?.max,
        tickAmount,
        labels: {
          formatter: (value: number) => formatBtcCount(toBtcCount(value)),
          style: { ...resolveAxisLabelStyle(isDark), colors: BITCOIN_COLOR },
        },
      },
    ],
    legend: {
      show: true,
      position: "top",
      horizontalAlign: "right",
      fontSize: "11px",
      fontFamily: "Roboto Mono",
      fontWeight: 700,
      offsetY: 2,
      itemMargin: { horizontal: 6, vertical: 0 },
      markers: { size: 5, offsetX: -2 },
      labels: { colors: isDark ? "#a1a1aa" : "#71717a" },
    },
  };
};
