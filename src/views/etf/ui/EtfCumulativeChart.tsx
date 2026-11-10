"use client";

import dynamic from "next/dynamic";
import { useMemo } from "react";
import { BITCOIN_COLOR } from "@/shared/config/color";
import useSettingStore from "@/shared/stores/settingStore";
import { Card, CardContent } from "@/shared/ui";
import type { EtfChartPoint } from "../lib/buildEtfOverview";
import { formatEtfDate, formatSignedEtfFlowInUsd } from "../lib/formatEtf";
import {
  createEtfCumulativeChartOptions,
  resolveCumulativeFlowColor,
} from "./createEtfCumulativeChartOptions";

const ReactApexChart = dynamic(() => import("react-apexcharts"), { ssr: false });
const CHART_HEIGHT = 240;

interface EtfCumulativeChartProps {
  /** 날짜 오름차순 일별 순유입과 그날 BTC 가격. */
  chartPoints: EtfChartPoint[];
}

// region [Privates]
/** 일별 차트와 같은 기준( 로컬 자정 )으로 맞춤. 축 라벨도 로컬 날짜로 읽음. */
const dateToTimestamp = (isoDate: string): number => {
  return new Date(`${isoDate}T00:00:00`).getTime();
};
// endregion

/** 상장 이후 누적 순유입과 BTC 가격을 한 차트에 겹쳐 봄. */
export default function EtfCumulativeChart({ chartPoints }: EtfCumulativeChartProps) {
  // region [Hooks]
  const isDark = useSettingStore((store) => store.theme) === "dark";
  const chartSeries = useMemo(() => {
    let cumulativeFlowInUsd = 0;
    const cumulativeData: { x: number; y: number }[] = [];
    const bitcoinPriceData: { x: number; y: number | null }[] = [];

    for (const { date, netFlowInUsd, bitcoinCloseInUsd } of chartPoints) {
      const timestamp = dateToTimestamp(date);
      cumulativeFlowInUsd += netFlowInUsd;
      cumulativeData.push({ x: timestamp, y: cumulativeFlowInUsd });
      bitcoinPriceData.push({ x: timestamp, y: bitcoinCloseInUsd });
    }

    return [
      { name: "누적 순유입", type: "area", data: cumulativeData },
      { name: "BTC 가격", type: "line", data: bitcoinPriceData },
    ];
  }, [chartPoints]);
  const chartOptions = useMemo(() => {
    const firstPoint = chartPoints.at(0);
    const lastPoint = chartPoints.at(-1);

    return createEtfCumulativeChartOptions({
      firstTimestamp: firstPoint ? dateToTimestamp(firstPoint.date) : undefined,
      lastTimestamp: lastPoint ? dateToTimestamp(lastPoint.date) : undefined,
      isDark,
    });
  }, [chartPoints, isDark]);
  // endregion

  // region [Privates]
  const firstPoint = chartPoints.at(0);
  const lastPoint = chartPoints.at(-1);
  const cumulativeFlowInUsd = chartPoints.reduce((sum, point) => sum + point.netFlowInUsd, 0);
  const cumulativeFlowColor = resolveCumulativeFlowColor(isDark);
  const periodLabel =
    firstPoint && lastPoint
      ? `${formatEtfDate(firstPoint.date)} ~ ${formatEtfDate(lastPoint.date)}`
      : "";
  const cumulativeLegendStyle = { backgroundColor: cumulativeFlowColor };
  const bitcoinLegendStyle = { backgroundColor: BITCOIN_COLOR };
  const chartWrapperStyle = { height: CHART_HEIGHT };
  // endregion

  return (
    <Card className="font-pretendard">
      <CardContent className="flex flex-col gap-3 p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-base font-bold">누적 순유입과 BTC 가격</h2>
            {periodLabel && (
              <p className="mt-0.5 font-number text-[11px] text-muted-foreground">{periodLabel}</p>
            )}
          </div>
          <strong className="font-number shrink-0 text-base font-black">
            {formatSignedEtfFlowInUsd(cumulativeFlowInUsd)}
          </strong>
        </div>

        <div className="-mx-2 select-none overflow-hidden" style={chartWrapperStyle}>
          <div role="img" aria-label="상장 이후 비트코인 ETF 누적 순유입과 비트코인 가격 추이 차트">
            <ReactApexChart
              type="line"
              series={chartSeries}
              options={chartOptions}
              height={CHART_HEIGHT}
              width="100%"
            />
          </div>
        </div>

        <div className="flex gap-3 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1">
            <i className="h-1.5 w-1.5 rounded-full" style={cumulativeLegendStyle} />
            누적 순유입 (왼쪽 축)
          </span>
          <span className="inline-flex items-center gap-1">
            <i className="h-1.5 w-1.5 rounded-full" style={bitcoinLegendStyle} />
            BTC 가격 (오른쪽 축)
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
