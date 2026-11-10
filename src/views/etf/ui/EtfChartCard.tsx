"use client";

import { useState } from "react";
import { Card, CardContent, SegmentedControl, type SegmentedControlOption } from "@/shared/ui";
import type { EtfChartPoint } from "../lib/buildEtfOverview";
import EtfCumulativeChart from "./EtfCumulativeChart";
import EtfFlowChart, { type EtfFlowPeriod } from "./EtfFlowChart";

type EtfChartTab = "daily" | "cumulative";

interface EtfChartCardProps {
  /** 날짜 오름차순 일별 순유입과 그날 BTC 가격. 두 차트가 같은 배열을 씀. */
  chartPoints: EtfChartPoint[];
}

const CHART_TAB_OPTIONS: Array<SegmentedControlOption<EtfChartTab>> = [
  { label: "일별 순유입", value: "daily" },
  { label: "누적 · BTC 가격", value: "cumulative" },
];

/**
 * 일별 차트와 누적 차트를 탭으로 묶은 카드.
 * 따로 쌓으면 화면이 길어져서 하나로 합침. 안 보이는 탭의 차트는 아예 안 그림.
 */
export default function EtfChartCard({ chartPoints }: EtfChartCardProps) {
  // region [Hooks]
  const [selectedTab, setSelectedTab] = useState<EtfChartTab>("daily");
  const [selectedPeriod, setSelectedPeriod] = useState<EtfFlowPeriod>("90");
  // endregion

  // region [Events]
  const onChangeSelectedTab = (nextTab: EtfChartTab): void => {
    setSelectedTab(nextTab);
  };

  const onChangeSelectedPeriod = (nextPeriod: EtfFlowPeriod): void => {
    setSelectedPeriod(nextPeriod);
  };
  // endregion

  return (
    <Card className="font-pretendard">
      <CardContent className="flex flex-col gap-3 p-4">
        <h2 className="sr-only">ETF 순유입 차트</h2>
        <SegmentedControl
          size="sm"
          options={CHART_TAB_OPTIONS}
          value={selectedTab}
          onChange={onChangeSelectedTab}
        />
        {selectedTab === "daily" ? (
          <EtfFlowChart
            chartPoints={chartPoints}
            selectedPeriod={selectedPeriod}
            onChangeSelectedPeriod={onChangeSelectedPeriod}
          />
        ) : (
          <EtfCumulativeChart chartPoints={chartPoints} />
        )}
      </CardContent>
    </Card>
  );
}
