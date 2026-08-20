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

export interface CreateApartmentChartOptionsParams {
  isDark: boolean;
  priceUnit: PriceUnit;
  years: number[];
  dealCounts: number[];
  partialYearFlags: boolean[];
  settledThroughMonths: number[];
  isLogScale: boolean;
}

/**
 * 년도별 막대 차트 옵션.
 *
 * 라인이 아니라 막대인 이유: 연도는 이산값이고, 신축 단지는 막대가 4개뿐이라
 * 라인으로 그리면 빈약해 보인다. 막대 4개는 그 자체로 완결된 그래프다.
 *
 * 로그 축을 쓰지 않는다. 차트 시작을 2014년으로 고정해 편차를 90배 수준으로 억제했고,
 * 로그 막대는 밑동이 0 이 아니게 되어 길이 비교가 왜곡된다.
 */
export const createApartmentChartOptions = ({
  isDark,
  priceUnit,
  years,
  dealCounts,
  partialYearFlags,
  settledThroughMonths,
  isLogScale,
}: CreateApartmentChartOptionsParams): ApexOptions => {
  const isBtcMode = priceUnit === "BTC";
  const seriesColor = resolveSeriesColor(priceUnit, isDark);

  const formatValue = (value: number) =>
    isBtcMode ? `₿ ${formatBtcCount(value)}` : `${formatKrwInEok(value)}억`;

  return {
    chart: {
      type: "bar",
      toolbar: { show: false },
      zoom: { enabled: false },
      background: "transparent",
      // 단위를 토글할 때 막대가 다시 자라며 방향 반전이 체감되도록 켜 둔다.
      animations: { enabled: true, speed: 420 },
    },
    theme: { mode: isDark ? "dark" : "light" },
    colors: [seriesColor],
    plotOptions: {
      bar: {
        borderRadius: 3,
        borderRadiusApplication: "end",
        columnWidth: years.length <= 5 ? "42%" : "68%",
        dataLabels: { position: "top" },
      },
    },
    states: {
      hover: { filter: { type: "lighten" } },
      active: { filter: { type: "none" } },
    },
    dataLabels: { enabled: false },
    grid: {
      borderColor: isDark ? "#3f3f46" : "#e5e7eb",
      strokeDashArray: 3,
      xaxis: { lines: { show: false } },
      padding: { left: 4, right: 8 },
    },
    tooltip: {
      theme: isDark ? "dark" : "light",
      style: { fontSize: "12px", fontFamily: "Roboto Mono" },
      marker: { show: false },
      x: {
        formatter: (_value, options) => {
          const index = options?.dataPointIndex ?? 0;
          const year = years[index];

          if (partialYearFlags[index]) {
            return `${year}년 · ${settledThroughMonths[index]}월까지 집계 중`;
          }

          return `${year}년`;
        },
      },
      y: {
        formatter: (value, options) => {
          const dealCount = dealCounts[options?.dataPointIndex ?? 0] ?? 0;

          if (value === null) {
            return "거래 없음";
          }

          // 표본이 얇은 해는 대표성이 떨어지므로 건수와 함께 그 사실을 알린다.
          if (isLowSampleYear(dealCount)) {
            return `${formatValue(value)} · ${dealCount}건 (표본 부족)`;
          }

          return `${formatValue(value)} · ${dealCount}건`;
        },
        title: { formatter: () => "" },
      },
    },
    xaxis: {
      // 진행 중인 연도는 라벨에서도 구분해 "값이 떨어졌다" 로 오독되는 것을 막는다.
      categories: years.map((year, index) => (partialYearFlags[index] ? `${year}*` : String(year))),
      axisBorder: { show: false },
      axisTicks: { show: false },
      labels: {
        rotate: 0,
        hideOverlappingLabels: true,
        style: {
          fontSize: "11px",
          fontFamily: "Roboto Mono",
          colors: isDark ? "#a1a1aa" : "#71717a",
        },
      },
    },
    yaxis: {
      /**
       * 로그 축은 값 범위가 수십 배를 넘을 때만 쓴다.
       * 막대 밑동이 0 이 아니게 되는 단점이 있지만, 선형으로 두면 최근 막대가
       * 전부 바닥에 붙어 추세 자체가 보이지 않는다.
       */
      logarithmic: isLogScale,
      forceNiceScale: !isLogScale,
      labels: {
        formatter: (value: number) =>
          isBtcMode ? formatBtcCount(value) : `${formatKrwInEok(value)}억`,
        style: {
          fontSize: "11px",
          fontFamily: "Roboto Mono",
          colors: isDark ? "#a1a1aa" : "#71717a",
        },
      },
    },
    legend: { show: false },
  };
};
