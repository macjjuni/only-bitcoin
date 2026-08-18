"use client";

import dynamic from "next/dynamic";
import { memo, useMemo } from "react";
import type { ApartmentYearPoint, PriceUnit } from "@/entities/apartment";
import useSettingStore from "@/shared/stores/settingStore";
import { Card, CardContent, SegmentedControl } from "@/shared/ui";
import { buildChartSeries } from "../lib/buildChartSeries";
import {
  createApartmentChartOptions,
  resolvePartialYearColor,
  shouldUseLogScale,
} from "./createApartmentChartOptions";

const ReactApexChart = dynamic(() => import("react-apexcharts"), { ssr: false });

const CHART_HEIGHT = 240;

const PRICE_UNIT_OPTIONS = [
  { label: "₿ BTC", value: "BTC" as const },
  { label: "₩ KRW", value: "KRW" as const },
];

interface Btc2ApartmentChartProps {
  yearPoints: ApartmentYearPoint[];
  areaInSquareMeter: number | null;
  priceUnit: PriceUnit;
  onChangePriceUnit: (priceUnit: PriceUnit) => void;
  isLoading: boolean;
  hasIncompleteYear: boolean;
}

const Btc2ApartmentChart = ({
  yearPoints,
  areaInSquareMeter,
  priceUnit,
  onChangePriceUnit,
  isLoading,
  hasIncompleteYear,
}: Btc2ApartmentChartProps) => {
  // region [Hooks]
  const isDark = useSettingStore((store) => store.theme) === "dark";

  const chartPoints = useMemo(
    () => buildChartSeries(yearPoints, areaInSquareMeter, priceUnit),
    [yearPoints, areaInSquareMeter, priceUnit],
  );

  const isLogScale = useMemo(
    () => shouldUseLogScale(chartPoints.map((point) => point.value)),
    [chartPoints],
  );

  const chartOptions = useMemo(
    () =>
      createApartmentChartOptions({
        isDark,
        priceUnit,
        isLogScale,
        years: chartPoints.map((point) => point.year),
        dealCounts: chartPoints.map((point) => point.dealCount),
        partialYearFlags: chartPoints.map((point) => point.isPartialYear),
        settledThroughMonths: chartPoints.map((point) => point.settledThroughMonth),
      }),
    [isDark, priceUnit, chartPoints, isLogScale],
  );

  /**
   * 진행 중인 연도만 흐리게 그리려면 데이터포인트마다 `fillColor` 를 넘겨야 한다.
   * ( `fill.opacity` 배열은 시리즈 단위라 막대 하나만 다르게 칠할 수 없다 )
   */
  const chartSeries = useMemo(
    () => [
      {
        name: priceUnit,
        data: chartPoints.map((point) => ({
          // 진행 중인 연도는 라벨에 `*` 를 붙여 확정 데이터와 구분한다.
          x: point.isPartialYear ? `${point.year}*` : String(point.year),
          y: point.value,
          ...(point.isPartialYear ? { fillColor: resolvePartialYearColor(priceUnit, isDark) } : {}),
        })),
      },
    ],
    [priceUnit, chartPoints, isDark],
  );
  // endregion

  // region [Events]
  const onChangeUnit = (value: string) => {
    onChangePriceUnit(value as PriceUnit);
  };
  // endregion

  // region [Templates]
  const StatusTemplate = useMemo(() => {
    if (isLoading) {
      return <span className="text-xs text-muted-foreground">불러오는 중…</span>;
    }

    if (hasIncompleteYear) {
      return <span className="text-xs text-muted-foreground">일부 기간 데이터 누락</span>;
    }

    return null;
  }, [isLoading, hasIncompleteYear]);

  const ChartBodyTemplate = useMemo(() => {
    const hasAnyValue = chartPoints.some((point) => point.value !== null);

    if (!hasAnyValue) {
      return (
        <div
          className="flex items-center justify-center text-sm text-muted-foreground"
          style={{ height: CHART_HEIGHT }}
        >
          {isLoading ? "실거래 데이터를 불러오는 중이에요." : "표시할 실거래가 없어요."}
        </div>
      );
    }

    return (
      <div className="-mx-2 select-none overflow-hidden" style={{ height: CHART_HEIGHT }}>
        <ReactApexChart
          type="bar"
          series={chartSeries}
          options={chartOptions}
          height={CHART_HEIGHT}
          width="100%"
        />
      </div>
    );
  }, [chartPoints, chartSeries, chartOptions, isLoading]);
  // endregion

  return (
    <Card className="font-number">
      <CardContent className="flex flex-col gap-2 p-4 pb-2">
        <div className="flex items-center justify-between gap-2">
          <SegmentedControl
            options={PRICE_UNIT_OPTIONS}
            value={priceUnit}
            onChange={onChangeUnit}
            size="sm"
            className="w-[132px]"
          />
          {StatusTemplate}
        </div>
        {ChartBodyTemplate}
      </CardContent>
    </Card>
  );
};

const MemoizedBtc2ApartmentChart = memo(Btc2ApartmentChart);
MemoizedBtc2ApartmentChart.displayName = "Btc2ApartmentChart";

export default MemoizedBtc2ApartmentChart;
