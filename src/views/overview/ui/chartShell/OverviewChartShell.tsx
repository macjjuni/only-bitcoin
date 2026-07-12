"use client";

import { KSpinner } from "kku-ui";
import dynamic from "next/dynamic";
import { useCallback, useMemo } from "react";
import useSettingStore from "@/shared/stores/settingStore";
import ChartChanger from "../chartChanger/ChartChanger";
import { createChartOptions } from "./createChartOptions";
import type { OverviewChartShellProps } from "./OverviewChartShell.interface";

const ReactApexChart = dynamic(() => import("react-apexcharts"), { ssr: false });

export default function OverviewChartShell<T extends string | number>({
  seriesName,
  seriesData,
  isLoading,
  formatter,
  intervalOptions,
  currentInterval,
  onChangeInterval,
  strokeWidth,
  fillOpacityTo,
  fillStops,
  chartHeight,
  topSlot,
  loadingClassName,
}: OverviewChartShellProps<T>) {
  // region [Hooks]
  const isDark = useSettingStore((store) => store.theme) === "dark";

  const maxPointIndex = useMemo(() => {
    if (!seriesData.length) return -1;
    return seriesData.reduce(
      (maxIdx, item, idx, arr) => (item.y > arr[maxIdx].y ? idx : maxIdx),
      0,
    );
  }, [seriesData]);

  const maxPoint = useMemo(() => {
    if (maxPointIndex < 0 || !seriesData[maxPointIndex]) return null;
    return seriesData[maxPointIndex];
  }, [maxPointIndex, seriesData]);

  const chartOptions = useMemo(
    () =>
      createChartOptions({
        isDark,
        formatter,
        maxPoint,
        strokeWidth,
        fillOpacityTo,
        fillStops,
      }),
    [isDark, formatter, maxPoint, strokeWidth, fillOpacityTo, fillStops],
  );

  const activeIndex = useMemo(
    () => intervalOptions.findIndex((opt) => opt.value === currentInterval),
    [intervalOptions, currentInterval],
  );

  const indicatorStyle = useMemo(
    () => ({
      width: `calc((100% - 8px) / ${intervalOptions.length})`,
      transform: `translateX(${Math.max(activeIndex, 0) * 100}%)`,
    }),
    [intervalOptions.length, activeIndex],
  );
  // endregion

  // region [Privates]
  /**
   * 차트 기간 버튼의 스타일 클래스를 생성
   */
  const getButtonClass = useCallback(
    (value: T) => {
      const isActive = currentInterval === value;
      const baseClass =
        "relative z-10 flex-1 h-[28px] text-sm font-medium transition-colors duration-200";
      const stateClass = isActive
        ? "text-white dark:text-black"
        : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200";

      return `${baseClass} ${stateClass}`;
    },
    [currentInterval],
  );
  // endregion

  return (
    <div className="relative flex flex-col justify-between gap-2 -mx-2 w-[calc(100%+1rem)] select-none overflow-hidden">
      {topSlot}

      <div className="relative w-full" style={{ height: chartHeight }}>
        {isLoading ? (
          <div className={loadingClassName ?? "flex justify-center items-center w-full h-full"}>
            <KSpinner color="#F7931A" />
          </div>
        ) : (
          <ReactApexChart
            type="area"
            series={[{ name: seriesName, data: seriesData }]}
            options={chartOptions}
            height={chartHeight}
            width="100%"
          />
        )}
      </div>

      <div className="relative flex justify-between items-center gap-3 px-2">
        <div className="relative flex items-center flex-1 rounded-lg p-1">
          <div
            className="absolute top-1 bottom-1 left-1 bg-black dark:opacity-100 dark:bg-white rounded-md shadow-sm transition-transform duration-300 ease-out"
            style={indicatorStyle}
          />
          {intervalOptions.map(({ value, text }) => (
            <button
              type="button"
              key={String(value)}
              className={getButtonClass(value)}
              onClick={() => onChangeInterval(value)}
            >
              {text}
            </button>
          ))}
        </div>
        <ChartChanger />
      </div>
    </div>
  );
}
