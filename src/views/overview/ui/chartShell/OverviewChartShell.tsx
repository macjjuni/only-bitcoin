"use client";

import {
  KDropdownMenu,
  KDropdownMenuCheckboxItem,
  KDropdownMenuContent,
  KDropdownMenuGroup,
  KDropdownMenuLabel,
  KDropdownMenuTrigger,
  KSpinner,
} from "kku-ui";
import { ChevronDown } from "lucide-react";
import dynamic from "next/dynamic";
import { useCallback, useMemo } from "react";
import { BITCOIN_COLOR } from "@/shared/config/color";
import useSettingStore from "@/shared/stores/settingStore";
import { CountText, UpdownIcon } from "@/shared/ui";
import useOverviewStore, { type OverviewChartType } from "../../model/overviewStore";
import { createChartOptions } from "./createChartOptions";
import type { OverviewChartShellProps } from "./OverviewChartShell.interface";

const ReactApexChart = dynamic(() => import("react-apexcharts"), { ssr: false });

const overviewChartOptions = [
  { label: "Market Price", value: "price" },
  { label: "Difficulty", value: "difficulty" },
  { label: "Hashrate", value: "hashrate" },
] as const;

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
  title,
  percentage,
  loadingClassName,
}: OverviewChartShellProps<T>) {
  // region [Hooks]
  const isDark = useSettingStore((store) => store.theme) === "dark";
  const overviewChart = useOverviewStore((store) => store.overviewChart);
  const setOverviewChart = useOverviewStore((store) => store.setOverviewChart);

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

  const maxPointRatio = useMemo(() => {
    if (maxPointIndex < 0 || seriesData.length <= 1) return 0.5;
    return maxPointIndex / (seriesData.length - 1);
  }, [maxPointIndex, seriesData.length]);

  const chartOptions = useMemo(
    () =>
      createChartOptions({
        isDark,
        formatter,
        maxPoint,
        maxPointRatio,
        strokeWidth,
        fillOpacityTo,
        fillStops,
      }),
    [isDark, formatter, maxPoint, maxPointRatio, strokeWidth, fillOpacityTo, fillStops],
  );

  const currentText = useMemo(
    () => intervalOptions.find((opt) => opt.value === currentInterval)?.text ?? "",
    [intervalOptions, currentInterval],
  );

  const selectedChartLabel = useMemo(
    () => overviewChartOptions.find((opt) => opt.value === overviewChart)?.label ?? "",
    [overviewChart],
  );
  // endregion

  // region [Events]
  const onClickChartOption = useCallback((chart: OverviewChartType) => {
    setOverviewChart(chart);
  }, []);
  // endregion

  return (
    <div className="relative flex flex-col justify-between gap-2 -mx-2 w-[calc(100%+1rem)] select-none overflow-hidden">
      <div className="flex justify-between items-center px-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 relative">
            <KDropdownMenu>
              <KDropdownMenuTrigger className="flex items-center gap-0.5 text-lg font-bold">
                {selectedChartLabel}
                <ChevronDown size={14} />
              </KDropdownMenuTrigger>

              <KDropdownMenuContent align="start" side="bottom" sideOffset={8}>
                <KDropdownMenuLabel>차트 선택</KDropdownMenuLabel>
                <KDropdownMenuGroup>
                  {overviewChartOptions.map((item) => (
                    <KDropdownMenuCheckboxItem
                      key={item.value}
                      checked={item.value === overviewChart}
                      onClick={() => onClickChartOption(item.value)}
                    >
                      {item.label}
                    </KDropdownMenuCheckboxItem>
                  ))}
                </KDropdownMenuGroup>
              </KDropdownMenuContent>
            </KDropdownMenu>

            {title && (
              <div className="flex items-center gap-1">
                <span className="text-sm font-number font-bold">{title}</span>

                {percentage !== undefined && Math.abs(percentage) > 0.01 && (
                  <span className="flex justify-center items-center gap-0.5 font-number font-bold text-[12px] leading-4">
                    <UpdownIcon isUp={percentage > 0} />
                    <CountText value={percentage} decimals={2} />%
                  </span>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <KDropdownMenu>
            <KDropdownMenuTrigger
              className={[
                "flex items-center gap-1 px-2 py-1 rounded-lg text-sm font-medium transition-colors duration-150",
                "bg-gray-100 dark:bg-gray-800",
                "data-[state=open]:bg-gray-200 dark:data-[state=open]:bg-gray-700",
              ].join(" ")}
            >
              {currentText}
              <ChevronDown size={14} />
            </KDropdownMenuTrigger>

            <KDropdownMenuContent align="end" side="bottom" sideOffset={8} className="min-w-0">
              <KDropdownMenuLabel>기간 선택</KDropdownMenuLabel>
              {intervalOptions.map(({ value, text }) => (
                <KDropdownMenuCheckboxItem
                  key={String(value)}
                  checked={currentInterval === value}
                  onCheckedChange={() => onChangeInterval(value)}
                >
                  {text}
                </KDropdownMenuCheckboxItem>
              ))}
            </KDropdownMenuContent>
          </KDropdownMenu>
        </div>
      </div>

      <div className="relative w-full" style={{ height: chartHeight }}>
        {isLoading ? (
          <div className={loadingClassName ?? "flex justify-center items-center w-full h-full"}>
            <KSpinner color={BITCOIN_COLOR} />
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
    </div>
  );
}
