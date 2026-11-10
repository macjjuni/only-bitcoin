"use client";

import {
  KDropdownMenu,
  KDropdownMenuCheckboxItem,
  KDropdownMenuContent,
  KDropdownMenuLabel,
  KDropdownMenuTrigger,
} from "kku-ui";
import { ChevronDown } from "lucide-react";
import { useMemo, useState } from "react";
import { Card, CardContent } from "@/shared/ui";
import type { EtfFundFlow } from "../lib/buildEtfOverview";
import { formatSignedEtfFlowInUsd } from "../lib/formatEtf";

/** ETF별 순유입을 볼 기간. */
type EtfFundPeriod = "latest" | "sevenDay" | "thirtyDay" | "cumulative";

interface EtfFundListCardProps {
  funds: EtfFundFlow[];
}

interface EtfFundPeriodOption {
  label: string;
  value: EtfFundPeriod;
}

interface EtfFundPeriodMenuItemProps {
  isSelected: boolean;
  option: EtfFundPeriodOption;
  onChangeSelectedPeriod: (nextPeriod: EtfFundPeriod) => void;
}

interface EtfFundBarRow {
  ticker: string;
  flowInUsd: number;
  /** 막대 영역 안에서의 위치와 길이(%). */
  barLeftPercent: number;
  barWidthPercent: number;
}

const PERIOD_OPTIONS: EtfFundPeriodOption[] = [
  { label: "최근 거래일", value: "latest" },
  { label: "최근 7거래일", value: "sevenDay" },
  { label: "최근 30거래일", value: "thirtyDay" },
  { label: "상장 후 누적", value: "cumulative" },
];

const PERIOD_VALUE_KEY: Record<EtfFundPeriod, keyof Omit<EtfFundFlow, "ticker">> = {
  latest: "latestInUsd",
  sevenDay: "sevenDayInUsd",
  thirtyDay: "thirtyDayInUsd",
  cumulative: "cumulativeInUsd",
};

// region [Privates]
const resolveFlowColorClassName = (flowInUsd: number): string => {
  if (flowInUsd === 0) {
    return "text-muted-foreground";
  }
  return flowInUsd > 0 ? "text-up" : "text-down";
};

/**
 * 순유입이 큰 순서로 줄을 만들고, 0 을 기준으로 좌우로 뻗는 막대의 위치를 계산함.
 * 유출만 있으면 기준선이 오른쪽 끝, 유입만 있으면 왼쪽 끝에 옴.
 *
 * 차트 라이브러리를 안 쓰는 이유: 가로 막대에 금액 라벨을 붙이면 음수 막대에서 라벨이
 * 막대 안으로 겹쳐 들어가는데 그걸 막대별로 조정할 방법이 없었음.
 */
const buildBarRows = (funds: EtfFundFlow[], selectedPeriod: EtfFundPeriod): EtfFundBarRow[] => {
  const valueKey = PERIOD_VALUE_KEY[selectedPeriod];
  const sortedFunds = [...funds].sort((firstFund, secondFund) => {
    return secondFund[valueKey] - firstFund[valueKey];
  });
  const flowValues = sortedFunds.map((fund) => fund[valueKey]);
  const maximumFlow = Math.max(...flowValues, 0);
  const minimumFlow = Math.min(...flowValues, 0);
  const flowRange = maximumFlow - minimumFlow;
  const zeroPercent = flowRange > 0 ? (-minimumFlow / flowRange) * 100 : 0;

  return sortedFunds.map((fund) => {
    const flowInUsd = fund[valueKey];
    const barWidthPercent = flowRange > 0 ? (Math.abs(flowInUsd) / flowRange) * 100 : 0;

    return {
      ticker: fund.ticker,
      flowInUsd,
      barLeftPercent: flowInUsd >= 0 ? zeroPercent : zeroPercent - barWidthPercent,
      barWidthPercent,
    };
  });
};
// endregion

function EtfFundPeriodMenuItem({
  isSelected,
  option,
  onChangeSelectedPeriod,
}: EtfFundPeriodMenuItemProps) {
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

/** ETF별 순유입을 기간을 바꿔 가며 비교함. */
export default function EtfFundListCard({ funds }: EtfFundListCardProps) {
  // region [Hooks]
  const [selectedPeriod, setSelectedPeriod] = useState<EtfFundPeriod>("latest");
  const barRows = useMemo(() => buildBarRows(funds, selectedPeriod), [funds, selectedPeriod]);
  // endregion

  // region [Privates]
  const selectedPeriodLabel =
    PERIOD_OPTIONS.find(({ value }) => value === selectedPeriod)?.label ?? "최근 거래일";
  // endregion

  // region [Events]
  const onChangeSelectedPeriod = (nextPeriod: EtfFundPeriod): void => {
    setSelectedPeriod(nextPeriod);
  };
  // endregion

  // region [Templates]
  const PeriodMenuItemTemplates = PERIOD_OPTIONS.map((option) => {
    return (
      <EtfFundPeriodMenuItem
        key={option.value}
        isSelected={selectedPeriod === option.value}
        option={option}
        onChangeSelectedPeriod={onChangeSelectedPeriod}
      />
    );
  });
  // endregion

  return (
    <Card className="font-pretendard">
      <CardContent className="flex flex-col gap-3 p-4">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-base font-bold">ETF별 순유입</h2>
          <KDropdownMenu>
            <KDropdownMenuTrigger
              aria-label="ETF별 순유입 기간 선택"
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

        <ul aria-label={`${selectedPeriodLabel} ETF별 순유입`} className="flex flex-col gap-2">
          {barRows.map((barRow) => (
            <li
              key={barRow.ticker}
              className="grid grid-cols-[44px_minmax(0,1fr)_76px] items-center gap-2"
            >
              <span className="font-number text-xs font-bold">{barRow.ticker}</span>
              <span aria-hidden="true" className="relative h-3 rounded-sm bg-foreground/5">
                <i
                  className={`absolute inset-y-0 rounded-sm ${barRow.flowInUsd >= 0 ? "bg-up" : "bg-down"}`}
                  style={{
                    left: `${barRow.barLeftPercent}%`,
                    width: `${barRow.barWidthPercent}%`,
                  }}
                />
              </span>
              <span
                className={`font-number text-right text-xs font-bold ${resolveFlowColorClassName(barRow.flowInUsd)}`}
              >
                {formatSignedEtfFlowInUsd(barRow.flowInUsd)}
              </span>
            </li>
          ))}
        </ul>

        <p className="text-xs leading-relaxed text-muted-foreground">
          막대 길이는 고른 기간 안에서의 상대 크기입니다. 초록은 유입, 빨강은 유출입니다.
        </p>
      </CardContent>
    </Card>
  );
}
