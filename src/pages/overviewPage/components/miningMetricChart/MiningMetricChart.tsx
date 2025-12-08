import React, { memo, useCallback, useEffect, useMemo, useRef } from "react";
import { Chart as ChartJS, LinearScale, LineElement, PointElement, Tooltip } from "chart.js";
import { KButton, KButtonGroup, KSpinner } from "kku-ui";
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
import "./MiningMetricChart.scss";


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
      return formatHashrate(data?.currentHashrate || 0);
    }
    if (overviewChart === "difficulty") {
      return formatDifficulty(data?.currentDifficulty || 0);
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
  const chartCardButtonClass = useCallback((value: MiningMetricChartIntervalType) => {

    const clazz = ["mining-metric-chart__button"];
    if (miningMetricChartInterval === value) {
      clazz.push("mining-metric-chart__button--active");
    }

    return clazz.join(" ");
  }, [miningMetricChartInterval]);

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
  // endregion

  // region [Templates]
  const LightningLottie = useMemo(() => (
    <div className="mining-metric-chart__top__left__area__ath-lottie"
         style={{ display: data && Percentage === 0 ? "flex" : "none" }}>
      {lightningLottie}
    </div>
  ), [data, Percentage, lightningLottie]);


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
            elements: { point: { radius: 0 }, line: { tension: 0.2, borderWidth: 2 } },
            scales: {
              x: { display: false },
              y: { display: false, suggestedMax: MaxValue * 1.014 }
            },
            animation: false
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
    <HorizontalCard className="mining-metric-chart">

      <div className="mining-metric-chart__top">

        <div className="mining-metric-chart__top__left">
          <div className="mining-metric-chart__top__left__area">
            <span className="mining-metric-chart__top__left__area__value">
              {AllTimeHighValue}
            </span>
            {LightningLottie}
            {Percentage !== 0 && (
              <span className="mining-metric-chart__top__left__area__rate">
                  <UpdownIcon isUp={Percentage > 0} />
                  <CountText value={Percentage} decimals={2} />%
                </span>
            )}
          </div>
        </div>
      </div>

      <div ref={chartBottomRef} className="mining-metric-chart__middle">
        {isLoading && <KSpinner className="mining-metric-chart__middle__spinner" />}
        {
          !isLoading && (
            <>
              {ChartArea}
              <div className="mining-metric-chart__middle__x">
                <span className="mining-metric-chart__middle__x__first">{xAxisValue.first}</span>
                <span className="mining-metric-chart__middle__x__middle">{xAxisValue.middle}</span>
                <span className="mining-metric-chart__middle__x__last">{xAxisValue.last}</span>
              </div>
            </>
          )
        }
      </div>

      <div className="mining-metric-chart__bottom">
      <KButtonGroup className="mining-metric-chart__bottom__buttons">
        {miningMetricChartIntervalOptions.map(({ value, text }) => (
          <KButton key={value} label={text} size="small" className={chartCardButtonClass(value)}
                   onClick={() => setHashrateChartInterval(value)} />
        ))}
      </KButtonGroup>
      <ChartChanger />
      </div>
    </HorizontalCard>
  );
};

const MemoizedMiningMetricChart = memo(MiningMetricChart);
MemoizedMiningMetricChart.displayName = 'MiningMetricChart';
MiningMetricChart.display = 'MiningMetricChart';

export default MemoizedMiningMetricChart;
