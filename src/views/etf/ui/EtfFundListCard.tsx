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
import type { BitcoinEtfFundSnapshot } from "@/entities/etf";
import useSettingStore from "@/shared/stores/settingStore";
import { Card, CardContent } from "@/shared/ui";
import {
  createEtfFundChartOptions,
  DOWN_FLOW_COLOR,
  type EtfFundMetric,
  EXCLUDED_FLOW_COLOR,
  resolveEtfFundBarColor,
  resolveEtfFundMetricValue,
  UP_FLOW_COLOR,
} from "./createEtfFundChartOptions";

const ReactApexChart = dynamic(() => import("react-apexcharts"), { ssr: false });
const CHART_HEIGHT = 300;

interface EtfFundListCardProps {
  funds: BitcoinEtfFundSnapshot[];
}

interface EtfFundMetricOption {
  label: string;
  value: EtfFundMetric;
}

interface EtfFundMetricMenuItemProps {
  isSelected: boolean;
  option: EtfFundMetricOption;
  onChangeSelectedMetric: (nextMetric: EtfFundMetric) => void;
}

const METRIC_OPTIONS: EtfFundMetricOption[] = [
  { label: "운용자산", value: "aum" },
  { label: "BTC 보유량", value: "holdings" },
  { label: "일일 순유입", value: "flow" },
];

// region [Privates]
const resolveFundChartData = (funds: BitcoinEtfFundSnapshot[], selectedMetric: EtfFundMetric) => {
  return funds.map((fund) => {
    const metricValue = resolveEtfFundMetricValue(fund, selectedMetric);
    const barColor = resolveEtfFundBarColor(fund, selectedMetric);

    return {
      x: fund.ticker,
      y: metricValue,
      fillColor: barColor,
    };
  });
};
// endregion

function EtfFundMetricMenuItem({
  isSelected,
  option,
  onChangeSelectedMetric,
}: EtfFundMetricMenuItemProps) {
  // region [Events]
  const onCheckedChangeMetricOption = (): void => {
    onChangeSelectedMetric(option.value);
  };
  // endregion

  return (
    <KDropdownMenuCheckboxItem checked={isSelected} onCheckedChange={onCheckedChangeMetricOption}>
      {option.label}
    </KDropdownMenuCheckboxItem>
  );
}

export function EtfFundListCard({ funds }: EtfFundListCardProps) {
  // region [Hooks]
  const isDark = useSettingStore((store) => store.theme) === "dark";
  const [selectedMetric, setSelectedMetric] = useState<EtfFundMetric>("aum");
  // endregion

  // region [Privates]
  const selectedMetricLabel =
    METRIC_OPTIONS.find(({ value }) => value === selectedMetric)?.label ?? "운용자산";
  const chartSeries = useMemo(() => {
    return [{ name: selectedMetricLabel, data: resolveFundChartData(funds, selectedMetric) }];
  }, [funds, selectedMetric, selectedMetricLabel]);
  const chartOptions = useMemo(() => {
    return createEtfFundChartOptions({ funds, isDark, selectedMetric });
  }, [funds, isDark, selectedMetric]);
  const isFlowMetricSelected = selectedMetric === "flow";
  // endregion

  // region [Events]
  const onChangeSelectedMetric = (nextMetric: EtfFundMetric): void => {
    setSelectedMetric(nextMetric);
  };
  // endregion

  // region [Templates]
  const MetricMenuItemTemplates = useMemo(() => {
    return METRIC_OPTIONS.map((option) => {
      return (
        <EtfFundMetricMenuItem
          key={option.value}
          isSelected={selectedMetric === option.value}
          option={option}
          onChangeSelectedMetric={onChangeSelectedMetric}
        />
      );
    });
  }, [selectedMetric]);
  // endregion

  return (
    <Card>
      <CardContent className="flex flex-col gap-3 p-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-bold">ETF별 현황</h2>
          </div>
          <KDropdownMenu>
            <KDropdownMenuTrigger
              aria-label="ETF 현황 지표 선택"
              className={[
                "flex items-center gap-0.5 rounded-full px-2.5 py-1.5 text-xs font-bold tracking-wide transition-all duration-200",
                "border border-gray-200 dark:border-gray-700",
                "hover:border-gray-300 dark:hover:border-gray-600",
                "data-[state=open]:border-orange-400 data-[state=open]:text-orange-500",
                "dark:data-[state=open]:border-orange-500 dark:data-[state=open]:text-orange-400",
              ].join(" ")}
            >
              <ChevronDown size={16} />
              {selectedMetricLabel}
            </KDropdownMenuTrigger>

            <KDropdownMenuContent align="end" side="bottom" sideOffset={8} className="min-w-0">
              <KDropdownMenuLabel>지표 선택</KDropdownMenuLabel>
              {MetricMenuItemTemplates}
            </KDropdownMenuContent>
          </KDropdownMenu>
        </div>

        <div className="-mx-2 select-none overflow-hidden" style={{ height: CHART_HEIGHT }}>
          <div role="img" aria-label={`ETF별 ${selectedMetricLabel} 비교 차트`}>
            <ReactApexChart
              type="bar"
              series={chartSeries}
              options={chartOptions}
              height={CHART_HEIGHT}
              width="100%"
            />
          </div>
        </div>

        {isFlowMetricSelected && (
          <div className="flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
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
            <span className="inline-flex items-center gap-1">
              <i
                className="h-1.5 w-1.5 rounded-full"
                style={{ backgroundColor: EXCLUDED_FLOW_COLOR }}
              />
              검증 제외
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
