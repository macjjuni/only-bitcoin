"use client";

import { KSpinner } from "kku-ui";
import dynamic from "next/dynamic";
import { memo, useMemo } from "react";
import type { ApartmentYearPoint } from "@/entities/apartment";
import { BITCOIN_COLOR } from "@/shared/config/color";
import useSettingStore from "@/shared/stores/settingStore";
import { buildChartSeries, type ChartPoint } from "../lib/buildChartSeries";
import {
  createApartmentChartOptions,
  resolveLogAxisRange,
  resolvePartialYearColor,
  resolveYearLabels,
  shouldUseLogScale,
  toLogSpace,
} from "./createApartmentChartOptions";

const ReactApexChart = dynamic(() => import("react-apexcharts"), { ssr: false });

const CHART_HEIGHT = 266;

interface Btc2ApartmentChartProps {
  yearPoints: ApartmentYearPoint[];
  areaInSquareMeter: number | null;
  isLoading: boolean;
  hasIncompleteYear: boolean;
}

/**
 * 연도별 실거래 중앙값을 KRW( 막대 ) · BTC( 선 ) 두 축으로 겹쳐 그린다.
 *
 * 단위를 골라 보는 토글이 있었으나 없앴다. 이 페이지의 요지는 "원화로는 올랐고
 * BTC 로는 내렸다" 는 **방향의 반대**인데, 한 번에 한 단위만 보이면 그 대비를
 * 사용자가 토글을 눌러 가며 머릿속에서 맞춰야 했다.
 */
const Btc2ApartmentChart = ({
  yearPoints,
  areaInSquareMeter,
  isLoading,
  hasIncompleteYear,
}: Btc2ApartmentChartProps) => {
  // region [Hooks]
  const isDark = useSettingStore((store) => store.theme) === "dark";

  /**
   * 서버가 KRW · BTC 를 모두 내려주므로 여기서는 필드를 고르기만 한다.
   * 시리즈를 두 벌 만드는 비용은 연도 수만큼의 map 뿐이다.
   */
  const btcPoints = useMemo(
    () => buildChartSeries(yearPoints, areaInSquareMeter, "BTC"),
    [yearPoints, areaInSquareMeter],
  );

  const krwPoints = useMemo(
    () => buildChartSeries(yearPoints, areaInSquareMeter, "KRW"),
    [yearPoints, areaInSquareMeter],
  );

  /**
   * BTC 축만 로그로 두려면 값을 직접 로그 공간으로 옮겨야 한다( `toLogSpace` 주석 참고 ).
   * 값 범위가 좁아 로그가 필요 없으면 `null` 이다.
   */
  const btcLogRange = useMemo(() => {
    const btcValues = btcPoints.map((point) => point.value);

    return shouldUseLogScale(btcValues) ? resolveLogAxisRange(btcValues) : null;
  }, [btcPoints]);

  const chartOptions = useMemo(
    () =>
      createApartmentChartOptions({
        isDark,
        btcLogRange,
        krwValues: krwPoints.map((point) => point.value),
        // 연도 · 건수처럼 단위와 무관한 축 정보는 어느 쪽 시리즈를 써도 같다.
        years: btcPoints.map((point) => point.year),
        dealCounts: btcPoints.map((point) => point.dealCount),
        partialYearFlags: btcPoints.map((point) => point.isPartialYear),
        settledThroughMonths: btcPoints.map((point) => point.settledThroughMonth),
      }),
    [isDark, btcLogRange, btcPoints, krwPoints],
  );

  /**
   * 진행 중인 연도만 흐리게 그리려면 데이터포인트마다 `fillColor` 를 넘겨야 한다.
   * ( `fill.opacity` 배열은 시리즈 단위라 막대 하나만 다르게 칠할 수 없다 )
   */
  const chartSeries = useMemo(() => {
    /**
     * 축 라벨은 `x` 로 정해진다( `resolveYearLabels` 주석 참고 ).
     * 옵션 쪽 `xaxis.categories` 와 같은 배열을 써야 축과 데이터가 어긋나지 않는다.
     */
    const yearLabels = resolveYearLabels(
      btcPoints.map((point) => point.year),
      btcPoints.map((point) => point.isPartialYear),
    );

    /** `partialYearColor` 를 주지 않으면( 선 시리즈 ) 색을 덮어쓰지 않는다. */
    const toSeriesData = (points: ChartPoint[], partialYearColor?: string) =>
      points.map((point, index) => ({
        x: yearLabels[index],
        y: point.value,
        ...(point.isPartialYear && partialYearColor ? { fillColor: partialYearColor } : {}),
      }));

    const btcSeriesPoints = btcLogRange
      ? btcPoints.map((point) => ({ ...point, value: toLogSpace(point.value) }))
      : btcPoints;

    return [
      // 순서는 `createApartmentChartOptions` 의 축 · 색 배열과 반드시 같아야 한다.
      {
        name: "KRW",
        type: "column",
        data: toSeriesData(krwPoints, resolvePartialYearColor("KRW", isDark)),
      },
      { name: "BTC", type: "line", data: toSeriesData(btcSeriesPoints) },
    ];
  }, [btcLogRange, krwPoints, btcPoints, isDark]);
  // endregion

  // region [Templates]
  /**
   * 로딩은 차트 자리의 스피너가 알린다. 여기서 또 "불러오는 중" 을 띄우면
   * 같은 상태가 위아래로 두 번 보인다.
   */
  const StatusTemplate = useMemo(() => {
    if (isLoading || !hasIncompleteYear) {
      return null;
    }

    return <span className="text-xs text-muted-foreground">일부 기간 데이터 누락</span>;
  }, [isLoading, hasIncompleteYear]);

  const ChartBodyTemplate = useMemo(() => {
    // 한쪽 단위만 값이 있어도 그릴 것이 있다.
    const hasAnyValue = [...krwPoints, ...btcPoints].some((point) => point.value !== null);

    if (isLoading && !hasAnyValue) {
      return (
        <div
          className="flex flex-col items-center justify-center gap-3"
          style={{ height: CHART_HEIGHT }}
        >
          <KSpinner color={BITCOIN_COLOR} />
          <span className="text-sm text-muted-foreground">실거래 데이터를 불러오는 중이에요.</span>
        </div>
      );
    }

    if (!hasAnyValue) {
      return (
        <div
          className="flex items-center justify-center text-sm text-muted-foreground"
          style={{ height: CHART_HEIGHT }}
        >
          표시할 실거래가 없어요.
        </div>
      );
    }

    return (
      // 바깥 여백( PageLayout p-2 + 패널 p-2 = 16px )까지만 파고들어야 페이지에 가로 스크롤이 안 생김.
      <div className="-mx-4 select-none overflow-hidden" style={{ height: CHART_HEIGHT }}>
        <ReactApexChart
          type="line"
          series={chartSeries}
          options={chartOptions}
          height={CHART_HEIGHT}
          width="100%"
        />
      </div>
    );
  }, [krwPoints, btcPoints, chartSeries, chartOptions, isLoading]);
  // endregion

  return (
    <div className="flex flex-col gap-2 font-number -mt-4">
      {StatusTemplate}
      {ChartBodyTemplate}
    </div>
  );
};

const MemoizedBtc2ApartmentChart = memo(Btc2ApartmentChart);
MemoizedBtc2ApartmentChart.displayName = "Btc2ApartmentChart";

export default MemoizedBtc2ApartmentChart;
