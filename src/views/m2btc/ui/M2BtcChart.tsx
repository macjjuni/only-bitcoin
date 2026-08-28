"use client";

import dynamic from "next/dynamic";
import { useMemo } from "react";
import { BITCOIN_COLOR } from "@/shared/config/color";
import { SERVICE_DOMAIN } from "@/shared/config/env";
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
  resolveUsM2Color,
  toBitcoinLogSpace,
} from "./createM2BtcChartOptions";

const ReactApexChart = dynamic(() => import("react-apexcharts"), { ssr: false });
/**
 * 차트 영역 가로세로비.
 *
 * 폭이 뷰포트를 따라 늘고 줄어서 고정 픽셀 높이로는 기기마다 비율이 달라짐.
 * 캡처 이미지가 어디서 찍히든 같은 인상이 되도록 비율로 고정함.
 *
 * 처음엔 황금비(1.618)였는데 카드에 요약 행과 범례가 함께 들어가면서 세로가
 * 길어져 1.8 로 눕힘. 카드 전체를 황금비로 맞추려면 차트가 절반까지 줄어 과함.
 */
const CHART_ASPECT_RATIO_CLASS = "aspect-[1.8]";

interface M2BtcChartProps {
  chartPoints: M2BtcChartPoint[];
  currentMonthKey: string;
}

// region [Privates]
function monthKeyToTimestamp(monthKey: string): number {
  return new Date(`${monthKey}-01T00:00:00Z`).getTime();
}
// endregion

interface SeriesSummaryProps {
  caption: string;
  isAlignedRight?: boolean;
  label: string;
  labelColor: string;
  value: string;
}

/**
 * 차트 위 시리즈 요약 한 덩어리.
 *
 * BTC 와 US M2 가 정렬 방향만 다르고 구조가 같아서 하나로 묶음.
 * 색은 차트 아래 범례와 Y축 라벨이 전담해서 여기선 안 씀. 예전엔 시리즈 색
 * 칩을 뒀는데 같은 대응을 세 번 말하는 셈이라 값이 묻혔음.
 * `min-w-0` 은 `truncate` 가 먹게 하려고 둠. 지우면 긴 값이 카드를 밀어냄.
 */
function SeriesSummary({ caption, isAlignedRight, label, labelColor, value }: SeriesSummaryProps) {
  return (
    <div className={isAlignedRight ? "min-w-0 text-right" : "min-w-0"}>
      <span className="block text-[11px] font-bold" style={{ color: labelColor }}>
        {label}
      </span>
      <strong className="mt-1 block truncate font-number text-xl font-black">{value}</strong>
      <span className="text-[10px] text-muted-foreground">{caption}</span>
    </div>
  );
}

interface LegendItemProps {
  color: string;
  label: string;
}

/**
 * 차트 아래 범례 한 항목.
 *
 * ApexCharts 내장 범례를 안 씀. 그쪽은 컨테이너에 padding-left, 항목에 margin,
 * 마커에 margin-right 1px 을 직접 박아서 점·글자 간격과 왼쪽 정렬을 offsetX
 * 매직넘버로 상쇄해야 하고, 그러면 래퍼( -mx-3 · overflow-hidden )에 잘림.
 * 도메인과 한 줄에 두려면 어차피 바깥 요소가 필요해서 직접 그림.
 */
function LegendItem({ color, label }: LegendItemProps) {
  return (
    <span className="inline-flex items-center justify-center gap-1 text-xs font-bold text-muted-foreground">
      <i className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: color }} />
      {label}
    </span>
  );
}

/** 미국 M2와 BTC 월별 가격을 이중 축으로 표시. */
export function M2BtcChart({ chartPoints, currentMonthKey }: M2BtcChartProps) {
  // region [Hooks]
  const isDark = useSettingStore((store) => store.theme) === "dark";
  const usM2Color = resolveUsM2Color(isDark);
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
  const chartPeriodLabel =
    chartPoints.length > 0 && latestBitcoinPoint
      ? `${formatMonthKey(chartPoints[0].monthKey)} ~ ${formatMonthKey(latestBitcoinPoint.monthKey)}`
      : "";
  const isLatestBitcoinMonthInProgress =
    latestBitcoinPoint !== null &&
    isCurrentBitcoinMonth(latestBitcoinPoint.monthKey, currentMonthKey);
  const latestBitcoinPriceLabel = isLatestBitcoinMonthInProgress
    ? "BTC 월간 최신값"
    : "BTC 월별 마지막 종가";
  const latestBitcoinMonthLabel = latestBitcoinPoint
    ? `${formatMonthKey(latestBitcoinPoint.monthKey)}${isLatestBitcoinMonthInProgress ? " · 진행 중" : ""}`
    : "";

  const LatestBitcoinTemplate = useMemo(() => {
    if (!latestBitcoinPoint) {
      return null;
    }

    return (
      <SeriesSummary
        caption={latestBitcoinMonthLabel}
        label={latestBitcoinPriceLabel}
        labelColor={BITCOIN_COLOR}
        value={formatBitcoinPriceInUsd(latestBitcoinPoint.bitcoinPriceInUsd)}
      />
    );
  }, [latestBitcoinMonthLabel, latestBitcoinPoint, latestBitcoinPriceLabel]);

  const LatestM2Template = useMemo(() => {
    if (!latestM2Point || latestM2Point.usM2InBillionsUsd === null) {
      return null;
    }

    return (
      <SeriesSummary
        isAlignedRight
        caption={`${formatMonthKey(latestM2Point.monthKey)} · 계절조정`}
        label="US M2"
        labelColor={usM2Color}
        value={formatUsM2InTrillionsUsd(latestM2Point.usM2InBillionsUsd)}
      />
    );
  }, [latestM2Point, usM2Color]);

  const ChartTemplate = useMemo(() => {
    if (chartPoints.length === 0) {
      return (
        <div
          className={`flex items-center justify-center text-sm text-muted-foreground ${CHART_ASPECT_RATIO_CLASS}`}
        >
          표시할 데이터가 없어요.
        </div>
      );
    }

    return (
      <div
        aria-label={chartAriaLabel}
        className={`relative -mx-3 select-none overflow-hidden ${CHART_ASPECT_RATIO_CLASS}`}
        role="img"
      >
        <ReactApexChart
          height="100%"
          options={chartOptions}
          series={chartSeries}
          type="line"
          width="100%"
        />
      </div>
    );
  }, [chartAriaLabel, chartOptions, chartPoints.length, chartSeries]);

  // endregion

  return (
    <Card className="font-pretendard">
      <CardContent className="flex flex-col gap-3 p-4">
        <div>
          <h2 className="text-lg font-bold">월별 M2와 비트코인 가격</h2>
          {chartPeriodLabel && (
            <p className="mt-0.5 text-[11px] text-muted-foreground">{chartPeriodLabel}</p>
          )}
        </div>

        <div className="flex items-start justify-between gap-4 -mb-2">
          {LatestBitcoinTemplate}
          {LatestM2Template}
        </div>

        {ChartTemplate}

        <div className="flex items-center justify-between gap-3 -mt-2.5">
          <span className="shrink-0 text-[10px] font-medium uppercase tracking-wide text-muted-foreground/70">
            {SERVICE_DOMAIN}
          </span>

          <div className="flex items-center gap-3">
            <LegendItem color={BITCOIN_COLOR} label="BTC" />
            {hasUsM2Data && <LegendItem color={usM2Color} label="US M2" />}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
