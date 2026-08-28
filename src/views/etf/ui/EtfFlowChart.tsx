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
import { useMemo, useState } from "react";
import type { BitcoinEtfDailyFlow } from "@/entities/etf";
import useSettingStore from "@/shared/stores/settingStore";
import { Card, CardContent } from "@/shared/ui";
import { formatSignedEtfFlowInUsd } from "../lib/formatEtf";
import {
  createEtfFlowChartOptions,
  DOWN_FLOW_COLOR,
  type EtfFlowChartOptionPoint,
  UP_FLOW_COLOR,
} from "./createEtfFlowChartOptions";

const ReactApexChart = dynamic(() => import("react-apexcharts"), { ssr: false });
const CHART_HEIGHT = 240;

type EtfFlowPeriod = "7" | "30" | "90" | "all";

interface EtfFlowChartProps {
  dailyFlows: BitcoinEtfDailyFlow[];
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
  { label: "7일", value: "7" },
  { label: "30일", value: "30" },
  { label: "90일", value: "90" },
  { label: "전체", value: "all" },
];

// region [Privates]
const dateToTimestamp = (isoDate: string): number => {
  return new Date(`${isoDate}T00:00:00`).getTime();
};

const resolveFlowChartPoints = (dailyFlows: BitcoinEtfDailyFlow[]): EtfFlowChartOptionPoint[] => {
  return dailyFlows.map(({ date, estimatedNetFlowInUsd }) => {
    return { date, estimatedNetFlowInUsd };
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

export function EtfFlowChart({ dailyFlows }: EtfFlowChartProps) {
  // region [Hooks]
  const isDark = useSettingStore((store) => store.theme) === "dark";
  const [selectedPeriod, setSelectedPeriod] = useState<EtfFlowPeriod>("all");
  // endregion

  // region [Privates]
  const selectedTradingDayCount = selectedPeriod === "all" ? null : Number(selectedPeriod);
  const visibleDailyFlows = useMemo(() => {
    if (selectedTradingDayCount === null) {
      return dailyFlows;
    }

    return dailyFlows.slice(-selectedTradingDayCount);
  }, [dailyFlows, selectedTradingDayCount]);
  const isFullHistory = selectedPeriod === "all";
  const chartPoints = useMemo(() => resolveFlowChartPoints(visibleDailyFlows), [visibleDailyFlows]);
  const chartSeries = useMemo(() => {
    return [
      {
        name: "추정 순유입",
        data: chartPoints.map(({ date, estimatedNetFlowInUsd }) => {
          return {
            x: dateToTimestamp(date),
            y: estimatedNetFlowInUsd,
            fillColor: estimatedNetFlowInUsd >= 0 ? UP_FLOW_COLOR : DOWN_FLOW_COLOR,
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
      return accumulatedFlowInUsd + dailyFlow.estimatedNetFlowInUsd;
    }, 0);
  }, [visibleDailyFlows]);
  const periodFlowColorClassName = periodNetFlowInUsd >= 0 ? "text-up" : "text-down";
  const selectedPeriodLabel =
    PERIOD_OPTIONS.find(({ value }) => value === selectedPeriod)?.label ?? "전체";
  const periodSummaryLabel = isFullHistory
    ? `전체 ${visibleDailyFlows.length}거래일 합계`
    : `최근 ${visibleDailyFlows.length}거래일 합계`;
  const chartAriaLabel = isFullHistory
    ? `전체 ${visibleDailyFlows.length}거래일 비트코인 ETF 추정 순유입 막대 차트`
    : `최근 ${visibleDailyFlows.length}거래일 비트코인 ETF 추정 순유입 막대 차트`;
  // endregion

  // region [Events]
  const onChangeSelectedPeriod = (nextPeriod: EtfFlowPeriod): void => {
    setSelectedPeriod(nextPeriod);
  };
  // endregion

  // region [Templates]
  const PeriodMenuItemTemplates = useMemo(() => {
    return PERIOD_OPTIONS.map((option) => {
      return (
        <EtfFlowPeriodMenuItem
          key={option.value}
          isSelected={selectedPeriod === option.value}
          option={option}
          onChangeSelectedPeriod={onChangeSelectedPeriod}
        />
      );
    });
  }, [selectedPeriod]);
  // endregion

  return (
    <Card className="font-pretendard">
      <CardContent className="flex flex-col gap-3 p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-base font-bold">BTC 현물 ETF 순유입</h2>
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

        <div className="-mx-2 select-none overflow-hidden" style={{ height: CHART_HEIGHT }}>
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

        <div className="flex items-end justify-between gap-3 border-t border-border pt-3">
          <div aria-live="polite">
            <p className="text-[11px] text-muted-foreground">{periodSummaryLabel}</p>
            <strong className={`font-number text-lg font-black ${periodFlowColorClassName}`}>
              {formatSignedEtfFlowInUsd(periodNetFlowInUsd)}
            </strong>
          </div>
          <div className="flex gap-3 text-[11px] text-muted-foreground">
            <span className="inline-flex items-center gap-1">
              <i className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: UP_FLOW_COLOR }} />
              유입
            </span>
            <span className="inline-flex items-center gap-1">
              <i
                className="h-1.5 w-1.5 rounded-full"
                style={{ backgroundColor: DOWN_FLOW_COLOR }}
              />
              유출
            </span>
          </div>
        </div>

        <p className="text-[11px] leading-relaxed text-muted-foreground">
          모든 ETF가 집계된 거래일만 표시합니다. 일부 ETF만 집계된 최근 날짜는 제외하며, 검증 제외
          행의 순유입액은 합계에 포함하지 않습니다.
        </p>
      </CardContent>
    </Card>
  );
}
