"use client";

import dynamic from "next/dynamic";
import { memo, useMemo } from "react";
import { useDcaStore } from "@/entities/dca";
import useSettingStore from "@/shared/stores/settingStore";
import { Card, CardContent } from "@/shared/ui";
import { calculateHoldingsSeries } from "../lib/calculateHoldingsSeries";
import { createHoldingsChartOptions } from "./createHoldingsChartOptions";

const ReactApexChart = dynamic(() => import("react-apexcharts"), { ssr: false });

const CHART_HEIGHT = 180;

const DcaHoldingsChart = () => {
  // region [Hooks]
  const records = useDcaStore((state) => state.records);
  const targetBtcCount = useDcaStore((state) => state.targetBtcCount);
  const isDark = useSettingStore((store) => store.theme) === "dark";

  const seriesData = useMemo(() => calculateHoldingsSeries(records), [records]);

  const maxHoldingBtcCount = useMemo(
    () => seriesData.reduce((max, point) => Math.max(max, point.y), 0),
    [seriesData],
  );

  const chartOptions = useMemo(
    () => createHoldingsChartOptions({ isDark, targetBtcCount, maxHoldingBtcCount }),
    [isDark, targetBtcCount, maxHoldingBtcCount],
  );
  // endregion

  if (seriesData.length === 0) {
    return null;
  }

  return (
    <Card className="font-number">
      <CardContent className="flex flex-col gap-1 p-4 pb-2">
        <span className="text-sm text-muted-foreground font-bold">보유량 추이</span>
        <div className="-mx-2 select-none overflow-hidden" style={{ height: CHART_HEIGHT }}>
          <ReactApexChart
            type="area"
            series={[{ name: "보유량", data: seriesData }]}
            options={chartOptions}
            height={CHART_HEIGHT}
            width="100%"
          />
        </div>
      </CardContent>
    </Card>
  );
};

const MemoizedDcaHoldingsChart = memo(DcaHoldingsChart);
MemoizedDcaHoldingsChart.displayName = "DcaHoldingsChart";

export default MemoizedDcaHoldingsChart;
