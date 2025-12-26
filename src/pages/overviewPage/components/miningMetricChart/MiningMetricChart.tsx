import React, { memo, useCallback, useEffect, useMemo, useRef } from "react";
import { Chart as ChartJS, LinearScale, LineElement, PointElement, Tooltip } from "chart.js";
import { KSpinner } from "kku-ui";
import { Line } from "react-chartjs-2";
import { useLottie } from "lottie-react";
import {
  ChartJsDataType,
  MarketChartIntervalTypeList
} from "@/pages/overviewPage/components/miningMetricChart/MiningMetricChart.interface";
import type { MiningMetricChartIntervalType } from "@/shared/stores/store.interface";
import { CountText, HorizontalCard, UpdownIcon } from "@/components";
import { ChartChanger } from "@/pages/overviewPage/components";
import { useMiningMetricChartData } from "@/shared/api";
import { formatDifficulty, formatHashrate } from "@/shared/utils/number";
import { removeSpaces } from "@/shared/utils/string";
import useStore from "@/shared/stores/store";
import LightningLottieData from "@/shared/assets/lottie/lightning.json";


// Chart.js 컴포넌트 등록
ChartJS.register(LinearScale, PointElement, Tooltip, LineElement);

const miningMetricChartIntervalOptions: MarketChartIntervalTypeList[] = [
  { text: "3M", value: "3m" },
  { text: "1Y", value: "1y" },
  { text: "3Y", value: "3y" },
  { text: "All", value: "all" }
];

const getChartDataset = (data: number[], index: number, isDark: boolean) => ({
  label: "", data, borderColor: isDark ? "#fff" : "#000", backgroundColor: "transparent",
  borderWidth: 2, pointBackgroundColor: "#f7931a",
  pointRadius: data.map((_, idx) => (idx === index ? 4 : 0)) // 최댓값 위치에 점 표시
});

/*
* 해시레이트 모든 차트는 데이터 크기가 많아 시간기반 균일 샘플링으로 최적화(64%) 했으나,
* 시간이 지날수록 데이터가 계속 늘어나므로 최적화 양을 늘리거나 알고리즘 변화가 필요함.
*  */

const MiningMetricChart = () => {

  // region [Hooks]
  const chartRef = useRef<ChartJS<"line", number[], string>>(null);
  const chartBottomRef = useRef<HTMLDivElement>(null);

  const overviewChart = useStore(store => store.overviewChart);
  const miningMetricChartInterval = useStore(state => state.miningMetricChartInterval);
  const setHashrateChartInterval = useStore(state => state.setMiningMetricChartInterval);
  const { data, isLoading } = useMiningMetricChartData(miningMetricChartInterval);

  const { View: lightningLottie } = useLottie({
    animationData: LightningLottieData,
    loop: true
  });
  const isDark = useStore(store => store.theme) === "dark";

  const ChartRowData = useMemo(() => {

    if (!data) {
      return { value: [], date: [] };
    }

    if (overviewChart === "hashrate") {
      return data.hashrates;
    } else if (overviewChart === "difficulty") {
      return data.difficulty;
    } else {
      throw Error("Invalid overview chart.");
    }
  }, [overviewChart, data]);

  const MaxValueIndex = useMemo(() => {
    const dataList = ChartRowData.value || [];
    const MaxValue = dataList.reduce((max: number, val: number) => (val > max ? val : max), -Infinity);

    return dataList.indexOf(MaxValue);
  }, [ChartRowData, miningMetricChartInterval]);

  const CurrentChartData = useMemo((): ChartJsDataType => ({

    labels: ChartRowData.date.map((timestamp: number) => new Date(timestamp * 1000).toLocaleDateString()) || [],
    datasets: [getChartDataset(ChartRowData.value || [], MaxValueIndex, isDark)]
  }), [ChartRowData, miningMetricChartInterval, MaxValueIndex]);

  const MaxValue = useMemo(() => (CurrentChartData.datasets[0].data[MaxValueIndex]), [CurrentChartData, MaxValueIndex]);
  const Percentage = useMemo(() => {

    if (!data) {
      return 0;
    }
    const factor = 10 ** 2;
    const targetCurrentValue = overviewChart === "hashrate" ? data.currentHashrate : data.currentDifficulty;
    const percentValue = (targetCurrentValue - MaxValue) / Math.abs(targetCurrentValue) * 100;

    return Math.floor(percentValue * factor) / factor;
  }, [data, MaxValue]);

  const AllTimeHighValue = useMemo(() => {
    if (!data) {
      return "";
    }
    if (overviewChart === "hashrate") {
      return `Hashrate: ${formatHashrate(data?.currentHashrate || 0)}`;
    }
    if (overviewChart === "difficulty") {
      return `Difficulty: ${formatDifficulty(data?.currentDifficulty || 0)}`;
    }
  }, [data, overviewChart]);
  // endregion


  // region [Privates]
  const getFormatDate = useCallback((timestamp: number) => {
    const dateStr = new Date(timestamp * 1000).toLocaleDateString();
    const sanitizedStrArr = removeSpaces(dateStr).split(".");

    return `${sanitizedStrArr[0]}.${sanitizedStrArr[1]}`;
  }, []);

  const initializeTooltip = useCallback(() => {

    if (CurrentChartData.labels.length > 0 && chartRef.current) {
      chartRef.current?.tooltip?.setActiveElements([{ datasetIndex: 0, index: MaxValueIndex }], { x: 0, y: 0 });
      chartRef.current?.update();
    }
  }, [MaxValueIndex, CurrentChartData]);
  // endregion


  // region [Styles]
  const xAxisValue = useMemo(() => {
    if (!data) {
      return { first: "-", middle: "-", last: "-" };
    }

    return {
      first: getFormatDate(ChartRowData.date[0]),
      middle: getFormatDate(ChartRowData.date[Math.floor(ChartRowData.date.length / 2)]),
      last: getFormatDate(ChartRowData.date[ChartRowData.date.length - 1])
    };
  }, [ChartRowData]);

  const getButtonClass = useCallback((value: MiningMetricChartIntervalType) => {
    const isActive = miningMetricChartInterval === value;
    return [
      "h-[30px] px-3 border-none text-sm shadow-none rounded-md transition-all",
      isActive
        ? "font-bold text-white bg-black/40 dark:bg-white/80 dark:text-black"
        : "text-current"
    ].filter(Boolean).join(" ");
  }, [miningMetricChartInterval]);
  // endregion

  // region [Templates]


  const ChartArea = useMemo(() => (
    <Line ref={chartRef} data={CurrentChartData} height="150%"
          className="mining-metric-chart__chart__wrapper__body"
          options={{
            plugins: {
              legend: { display: false },
              decimation: {
                enabled: true,
                algorithm: "lttb",
                samples: 1
              },
              tooltip: {
                enabled: true,
                usePointStyle: true,
                caretPadding: 6,
                backgroundColor: "rgba(0, 0, 0, 0.72)",
                callbacks: {
                  label: (e) => `${
                    overviewChart === "hashrate" ? formatHashrate(e.raw as number) : formatDifficulty(e.raw as number)
                  }`
                }
              }
            },
            elements: { point: { radius: 0 }, line: { tension: 0.1, borderWidth: 2 } },
            scales: {
              x: { display: false },
              y: { display: false, suggestedMax: MaxValue * 1.014 }
            },
            animation: { duration: 800, easing: "easeInOutQuart", onComplete: initializeTooltip },
            transitions: { active: { animation: { duration: 0 } } },
            animations: {
              x: { duration: 0 },
              y: { duration: 0 }
            } as never
          }}
    />
  ), [MaxValue, CurrentChartData]);
  // endregion


  // region [Life Cycles]
  useEffect(() => {
    if (chartRef?.current) {
      initializeTooltip();
    }
  }, [initializeTooltip]);
  // endregion

  return (
    // .mining-metric-chart
    <HorizontalCard
      className="relative flex flex-col justify-between gap-2 w-[calc(100%+1rem)] p-0 -mx-2 border-none select-none overflow-hidden">

      {/* .mining-metric-chart__top */}
      <div className="flex flex-col justify-start gap-2 text-current relative">
        <div className="flex justify-start items-center px-2">
          {/* .mining-metric-chart__top__left__area */}
          <div className="flex gap-2 relative">
            <span className="text-base font-number font-bold">
              {AllTimeHighValue}
            </span>

            <div className="absolute top-1/2 -right-8 -translate-y-[46%] flex justify-center items-center w-10 h-10"
                 style={{ display: data && Percentage === 0 ? "flex" : "none" }}>
              <div className="absolute top-1/2 -right-8 -translate-y-[46%] flex justify-center items-center w-10 h-10"
                   style={{ display: data && Percentage === 0 ? "flex" : "none" }}>
                {lightningLottie}
              </div>
            </div>

            {Percentage !== 0 && (
              <span className="flex justify-center items-center gap-0.5 font-number font-bold text-[12px] leading-4">
                <UpdownIcon isUp={Percentage > 0} />
                <CountText value={Percentage} decimals={2} />%
              </span>
            )}
          </div>
        </div>
      </div>

      {/* .mining-metric-chart__middle */}
      <div ref={chartBottomRef} className="relative pointer-events-none z-[3]">
        {isLoading ? (
          <KSpinner className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" color="#F7931A" />
        ) : (
          <>
            {ChartArea}
            {/* .mining-metric-chart__middle__x */}
            <div
              className="absolute -bottom-4 left-0 w-full px-2 flex justify-between items-center text-[12px] font-number">
              <span>{xAxisValue.first}</span>
              <span>{xAxisValue.middle}</span>
              <span>{xAxisValue.last}</span>
            </div>
          </>
        )}
      </div>

      {/* .mining-metric-chart__bottom */}
      <div className="flex justify-between items-center pt-3 px-2">
        <div className="flex justify-center items-center gap-8 w-full pl-3">
          {miningMetricChartIntervalOptions.map(({ value, text }) => (
            <button type="button" key={value} className={getButtonClass(value)} onClick={() => setHashrateChartInterval(value)}>
              {text}
            </button>
          ))}
        </div>
        <ChartChanger />
      </div>
    </HorizontalCard>
  );
};

const MemoizedMiningMetricChart = memo(MiningMetricChart);
MemoizedMiningMetricChart.displayName = "MiningMetricChart";
MiningMetricChart.display = "MiningMetricChart";

export default MemoizedMiningMetricChart;
