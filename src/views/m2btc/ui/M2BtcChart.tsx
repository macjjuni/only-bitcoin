"use client";

import dynamic from "next/dynamic";
import { useMemo } from "react";
import { BITCOIN_COLOR } from "@/shared/config/color";
import useSettingStore from "@/shared/stores/settingStore";
import { Card, CardContent } from "@/shared/ui";
import type { M2BtcChartPoint } from "../lib/buildM2BtcSeries";
import { isCurrentBitcoinMonth } from "../lib/isCurrentBitcoinMonth";
import {
  createM2BtcChartOptions,
  formatBitcoinPriceInUsd,
  formatMonthKey,
  formatUsM2InTrillionsUsd,
  resolveBitcoinLogAxisRange,
  toBitcoinLogSpace,
  US_M2_COLOR,
} from "./createM2BtcChartOptions";

const ReactApexChart = dynamic(() => import("react-apexcharts"), { ssr: false });
const CHART_HEIGHT = 360;

interface M2BtcChartProps {
  chartPoints: M2BtcChartPoint[];
  currentMonthKey: string;
}

// region [Privates]
function monthKeyToTimestamp(monthKey: string): number {
  return new Date(`${monthKey}-01T00:00:00Z`).getTime();
}
// endregion

/** 미국 M2와 BTC 월별 가격을 이중 축으로 표시한다. */
export function M2BtcChart({ chartPoints, currentMonthKey }: M2BtcChartProps) {
  // region [Hooks]
  const isDark = useSettingStore((store) => store.theme) === "dark";
  // endregion

  // region [Templates]
  const latestBitcoinPoint = chartPoints.at(-1) ?? null;
  const latestM2Point = chartPoints.findLast(({ usM2InBillionsUsd }) => {
    return usM2InBillionsUsd !== null;
  });
  const bitcoinPricesInUsd = useMemo(() => {
    return chartPoints.map(({ bitcoinPriceInUsd }) => bitcoinPriceInUsd);
  }, [chartPoints]);
  const usM2ValuesInBillionsUsd = useMemo(() => {
    return chartPoints.flatMap(({ usM2InBillionsUsd }) => {
      return usM2InBillionsUsd === null ? [] : [usM2InBillionsUsd];
    });
  }, [chartPoints]);
  const hasUsM2Data = usM2ValuesInBillionsUsd.length > 0;
  const firstMonthTimestamp = chartPoints[0]
    ? monthKeyToTimestamp(chartPoints[0].monthKey)
    : undefined;
  const lastMonthTimestamp = latestBitcoinPoint
    ? monthKeyToTimestamp(latestBitcoinPoint.monthKey)
    : undefined;
  const bitcoinLogAxisRange = useMemo(() => {
    return resolveBitcoinLogAxisRange(bitcoinPricesInUsd);
  }, [bitcoinPricesInUsd]);
  const chartOptions = useMemo(() => {
    return createM2BtcChartOptions({
      bitcoinLogAxisRange,
      firstMonthTimestamp,
      isDark,
      lastMonthTimestamp,
      usM2ValuesInBillionsUsd,
    });
  }, [
    bitcoinLogAxisRange,
    firstMonthTimestamp,
    isDark,
    lastMonthTimestamp,
    usM2ValuesInBillionsUsd,
  ]);
  const chartSeries = useMemo(() => {
    return [
      {
        name: "BTC",
        data: chartPoints.map(({ bitcoinPriceInUsd, monthKey }) => {
          return {
            x: monthKeyToTimestamp(monthKey),
            y: toBitcoinLogSpace(bitcoinPriceInUsd),
          };
        }),
      },
      {
        name: "US M2",
        data: chartPoints.map(({ monthKey, usM2InBillionsUsd }) => {
          return {
            x: monthKeyToTimestamp(monthKey),
            y: usM2InBillionsUsd,
          };
        }),
      },
    ];
  }, [chartPoints]);
  const chartAriaLabel =
    chartPoints.length > 0 && latestBitcoinPoint
      ? `${formatMonthKey(chartPoints[0].monthKey)}부터 ${formatMonthKey(latestBitcoinPoint.monthKey)}까지 미국 M2와 비트코인 월별 가격 비교 차트`
      : "미국 M2와 비트코인 월별 가격 비교 차트";
  const isLatestBitcoinMonthInProgress =
    latestBitcoinPoint !== null &&
    isCurrentBitcoinMonth(latestBitcoinPoint.monthKey, currentMonthKey);
  const latestBitcoinPriceLabel = isLatestBitcoinMonthInProgress
    ? "BTC 월간 최신값"
    : "BTC 월말 종가";
  const latestBitcoinMonthLabel = latestBitcoinPoint
    ? `${formatMonthKey(latestBitcoinPoint.monthKey)}${isLatestBitcoinMonthInProgress ? " · 진행 중" : ""}`
    : "";

  const LatestBitcoinTemplate = useMemo(() => {
    if (!latestBitcoinPoint) {
      return null;
    }

    return (
      <div className="min-w-0">
        <span className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
          <i className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: BITCOIN_COLOR }} />
          {latestBitcoinPriceLabel}
        </span>
        <strong className="mt-0.5 block truncate font-number text-base font-black">
          {formatBitcoinPriceInUsd(latestBitcoinPoint.bitcoinPriceInUsd)}
        </strong>
        <span className="text-[10px] text-muted-foreground">{latestBitcoinMonthLabel}</span>
      </div>
    );
  }, [latestBitcoinMonthLabel, latestBitcoinPoint, latestBitcoinPriceLabel]);

  const LatestM2Template = useMemo(() => {
    if (!latestM2Point || latestM2Point.usM2InBillionsUsd === null) {
      return null;
    }

    return (
      <div className="min-w-0 text-right">
        <span className="flex items-center justify-end gap-1.5 text-[11px] text-muted-foreground">
          US M2
          <i className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: US_M2_COLOR }} />
        </span>
        <strong className="mt-0.5 block truncate font-number text-base font-black">
          {formatUsM2InTrillionsUsd(latestM2Point.usM2InBillionsUsd)}
        </strong>
        <span className="text-[10px] text-muted-foreground">
          {formatMonthKey(latestM2Point.monthKey)} · 계절조정
        </span>
      </div>
    );
  }, [latestM2Point]);

  const ChartTemplate = useMemo(() => {
    if (chartPoints.length === 0) {
      return (
        <div
          className="flex items-center justify-center text-sm text-muted-foreground"
          style={{ height: CHART_HEIGHT }}
        >
          표시할 데이터가 없어요.
        </div>
      );
    }

    return (
      <div
        aria-label={chartAriaLabel}
        className="-mx-3 select-none overflow-hidden"
        role="img"
        style={{ height: CHART_HEIGHT }}
      >
        <ReactApexChart
          height={CHART_HEIGHT}
          options={chartOptions}
          series={chartSeries}
          type="line"
          width="100%"
        />
      </div>
    );
  }, [chartAriaLabel, chartOptions, chartPoints.length, chartSeries]);

  const DataDescriptionTemplate = useMemo(() => {
    if (!hasUsM2Data) {
      return (
        <>
          BTC는 완료된 달의 월말 USD 종가와 진행 중인 달의 최신 USD 종가를 로그 축으로 표시합니다.
          현재 비교 가능한 미국 M2 데이터가 없습니다.
        </>
      );
    }

    return (
      <>
        BTC는 완료된 달의 월말 USD 종가와 진행 중인 달의 최신 USD 종가를 로그 축으로 표시합니다. M2
        미발표 월은 값을 임의로 채우지 않으며 파란 선만 마지막 공식 발표 월에서 끝납니다.
      </>
    );
  }, [hasUsM2Data]);
  // endregion

  return (
    <Card className="font-pretendard">
      <CardContent className="flex flex-col gap-3 p-4 pb-3">
        <div className="flex items-start justify-between gap-4">
          {LatestBitcoinTemplate}
          {LatestM2Template}
        </div>

        {ChartTemplate}

        <p className="border-t border-border pt-3 text-[11px] leading-relaxed text-muted-foreground">
          {DataDescriptionTemplate}
        </p>
      </CardContent>
    </Card>
  );
}
