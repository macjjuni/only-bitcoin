"use client";

import {
  KDropdownMenu,
  KDropdownMenuCheckboxItem,
  KDropdownMenuContent,
  KDropdownMenuLabel,
  KDropdownMenuTrigger,
} from "kku-ui";
import { ChevronDown } from "lucide-react";
import dynamic from "next/dynamic";
import { useMemo } from "react";
import useSettingStore from "@/shared/stores/settingStore";
import type { EtfChartPoint } from "../lib/buildEtfOverview";
import { formatSignedEtfFlowInUsd } from "../lib/formatEtf";
import {
  createEtfFlowChartOptions,
  DOWN_FLOW_COLOR,
  type EtfFlowChartOptionPoint,
  UP_FLOW_COLOR,
} from "./createEtfFlowChartOptions";

const ReactApexChart = dynamic(() => import("react-apexcharts"), { ssr: false });
const CHART_HEIGHT = 240;

export type EtfFlowPeriod = "7" | "30" | "90" | "all";

interface EtfFlowChartProps {
  /** 날짜 오름차순 일별 순유입. 휴장일은 빠져 있음. */
  chartPoints: EtfChartPoint[];
  /** 기간은 바깥 카드가 들고 있음. 탭을 오가도 고른 기간이 안 풀리게 하려는 것. */
  selectedPeriod: EtfFlowPeriod;
  onChangeSelectedPeriod: (nextPeriod: EtfFlowPeriod) => void;
}

interface EtfFlowPeriodOption {
  label: string;
  value: EtfFlowPeriod;
}

interface EtfFlowPeriodMenuItemProps {
  isSelected: boolean;
  option: EtfFlowPeriodOption;
  onChangeSelectedPeriod: (nextPeriod: EtfFlowPeriod) => void;
}

const PERIOD_OPTIONS: EtfFlowPeriodOption[] = [
  { label: "7거래일", value: "7" },
  { label: "30거래일", value: "30" },
  { label: "90거래일", value: "90" },
  { label: "전체", value: "all" },
];

// region [Privates]
const dateToTimestamp = (isoDate: string): number => {
  return new Date(`${isoDate}T00:00:00`).getTime();
};

const resolveFlowChartPoints = (chartPoints: EtfChartPoint[]): EtfFlowChartOptionPoint[] => {
  return chartPoints.map(({ date, netFlowInUsd }) => {
    return { date, netFlowInUsd };
  });
};
// endregion

function EtfFlowPeriodMenuItem({
  isSelected,
  option,
  onChangeSelectedPeriod,
}: EtfFlowPeriodMenuItemProps) {
  // region [Events]
  const onCheckedChangePeriodOption = (): void => {
    onChangeSelectedPeriod(option.value);
  };
  // endregion

  return (
    <KDropdownMenuCheckboxItem checked={isSelected} onCheckedChange={onCheckedChangePeriodOption}>
      {option.label}
    </KDropdownMenuCheckboxItem>
  );
}

/** 일별 순유입 막대 차트. 카드는 바깥( `EtfChartCard` )이 그리고 여기선 안쪽 내용만 그림. */
export default function EtfFlowChart({
  chartPoints: allChartPoints,
  selectedPeriod,
  onChangeSelectedPeriod,
}: EtfFlowChartProps) {
  // region [Hooks]
  const isDark = useSettingStore((store) => store.theme) === "dark";
  const isFullHistory = selectedPeriod === "all";
  const visibleDailyFlows = useMemo(() => {
    return isFullHistory ? allChartPoints : allChartPoints.slice(-Number(selectedPeriod));
  }, [allChartPoints, isFullHistory, selectedPeriod]);
  const chartPoints = useMemo(() => resolveFlowChartPoints(visibleDailyFlows), [visibleDailyFlows]);
  const chartSeries = useMemo(() => {
    return [
      {
        name: "순유입",
        data: chartPoints.map(({ date, netFlowInUsd }) => {
          return {
            x: dateToTimestamp(date),
            y: netFlowInUsd,
            fillColor: netFlowInUsd >= 0 ? UP_FLOW_COLOR : DOWN_FLOW_COLOR,
          };
        }),
      },
    ];
  }, [chartPoints]);
  const chartOptions = useMemo(() => {
    return createEtfFlowChartOptions({
      dailyFlows: chartPoints,
      isDark,
      isFullHistory,
    });
  }, [chartPoints, isDark, isFullHistory]);
  const periodNetFlowInUsd = useMemo(() => {
    return visibleDailyFlows.reduce((accumulatedFlowInUsd, dailyFlow) => {
      return accumulatedFlowInUsd + dailyFlow.netFlowInUsd;
    }, 0);
  }, [visibleDailyFlows]);
  // endregion

  // region [Privates]
  const periodFlowColorClassName = periodNetFlowInUsd >= 0 ? "text-up" : "text-down";
  const selectedPeriodLabel =
    PERIOD_OPTIONS.find(({ value }) => value === selectedPeriod)?.label ?? "90거래일";
  const periodPrefix = isFullHistory ? "전체" : "최근";
  const periodSummaryLabel = `${periodPrefix} ${visibleDailyFlows.length}거래일 합계`;
  const chartAriaLabel = `${periodPrefix} ${visibleDailyFlows.length}거래일 비트코인 ETF 순유입 막대 차트`;
  const chartWrapperStyle = { height: CHART_HEIGHT };
  const upLegendStyle = { backgroundColor: UP_FLOW_COLOR };
  const downLegendStyle = { backgroundColor: DOWN_FLOW_COLOR };
  // endregion

  // region [Templates]
  const PeriodMenuItemTemplates = PERIOD_OPTIONS.map((option) => {
    return (
      <EtfFlowPeriodMenuItem
        key={option.value}
        isSelected={selectedPeriod === option.value}
        option={option}
        onChangeSelectedPeriod={onChangeSelectedPeriod}
      />
    );
  });
  // endregion

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-start justify-between gap-3">
        <div aria-live="polite">
          <p className="text-xs text-muted-foreground">{periodSummaryLabel}</p>
          <strong className={`font-number text-xl font-black ${periodFlowColorClassName}`}>
            {formatSignedEtfFlowInUsd(periodNetFlowInUsd)}
          </strong>
        </div>
        <KDropdownMenu>
          <KDropdownMenuTrigger
            aria-label="ETF 순유입 기간 선택"
            className={[
              "flex items-center gap-0.5 rounded-full px-2.5 py-1.5 text-xs font-bold tracking-wide transition-all duration-200",
              "border border-gray-200 dark:border-gray-700",
              "hover:border-gray-300 dark:hover:border-gray-600",
              "data-[state=open]:border-orange-400 data-[state=open]:text-orange-500",
              "dark:data-[state=open]:border-orange-500 dark:data-[state=open]:text-orange-400",
            ].join(" ")}
          >
            <ChevronDown size={16} />
            {selectedPeriodLabel}
          </KDropdownMenuTrigger>

          <KDropdownMenuContent align="end" side="bottom" sideOffset={8} className="min-w-0">
            <KDropdownMenuLabel>기간 선택</KDropdownMenuLabel>
            {PeriodMenuItemTemplates}
          </KDropdownMenuContent>
        </KDropdownMenu>
      </div>

      <div className="-mx-2 select-none overflow-hidden" style={chartWrapperStyle}>
        <div role="img" aria-label={chartAriaLabel}>
          <ReactApexChart
            type="bar"
            series={chartSeries}
            options={chartOptions}
            height={CHART_HEIGHT}
            width="100%"
          />
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 text-xs text-muted-foreground">
        <span>미국 휴장일은 빼고 거래일만 표시합니다.</span>
        <span className="flex gap-3">
          <span className="inline-flex items-center gap-1">
            <i className="h-1.5 w-1.5 rounded-full" style={upLegendStyle} />
            유입
          </span>
          <span className="inline-flex items-center gap-1">
            <i className="h-1.5 w-1.5 rounded-full" style={downLegendStyle} />
            유출
          </span>
        </span>
      </div>
    </div>
  );
}
