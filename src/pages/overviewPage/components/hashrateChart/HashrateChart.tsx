import React, { memo, useCallback, useMemo, useRef } from "react";
import { CategoryScale, Chart as ChartJS, Legend, LinearScale, LineElement, PointElement, Tooltip } from "chart.js";
import { KButton, KButtonGroup, KIcon } from "kku-ui";
import { Line } from "react-chartjs-2";
import {
  ChartJsDataType,
  MarketChartIntervalTypeList
} from "@/pages/overviewPage/components/hashrateChart/HashrateChart.interface";
import { HashrateChartIntervalType } from "@/shared/stores/store.interface";
import useStore from "@/shared/stores/store";
import { HorizontalCard } from "@/components";
import { useHashrateChartData } from "@/shared/api";
import "./HashrateChart.scss";
import {formatHashrate} from '@/shared/utils/number'


// Chart.js 컴포넌트 등록
ChartJS.register(CategoryScale, LinearScale, PointElement, Tooltip, Legend, LineElement);

const hashrateChartIntervalOptions: MarketChartIntervalTypeList[] = [
  { text: "3M", value: "3m" },
  // { text: "6m", value: "6m" },
  { text: "1Y", value: "1y" },
  // { text: "2Y", value: "2y" },
  { text: "3Y", value: "3y" },
  { text: "All", value: "all" },
];

const getChartDataset = (data: number[], index: number, isDark: boolean) => ({
  label: "", data, borderColor: isDark ? "#fff" : '#000', backgroundColor: "transparent",
  borderWidth: 2, pointBackgroundColor: "#f7931a", pointHoverRadius: 4,
  pointRadius: data.map((_, idx) => (idx === index ? 4 : 0)) // 최댓값 위치에 점 표시
});


const HashrateChart = () => {

  // region [Hooks]
  const chartRef = useRef<ChartJS<"line", number[], string>>(null);
  const hashrateChartInterval = useStore(state => state.hashrateChartInterval);
  const setHashrateChartInterval = useStore(state => state.setHashrateChartInterval);
  const { data, isError } = useHashrateChartData(hashrateChartInterval);

  const isDark = useStore(store => store.theme) === 'dark';


  const maxValueIndex = useMemo(() => {
    const dataList = data?.hashrates.value || [];
    const maxValue = dataList.reduce((max: number, val: number) => (val > max ? val : max), -Infinity);

    return dataList.indexOf(maxValue);
  }, [data, hashrateChartInterval]);


  const currentChartData = useMemo((): ChartJsDataType => ({

    labels: data?.hashrates.date.map((timestamp: number) => new Date(timestamp).toLocaleDateString()) || [],
    datasets: [getChartDataset(data?.hashrates.value || [], maxValueIndex, isDark)]
  }), [data, hashrateChartInterval, maxValueIndex]);

  const maxValue = useMemo(() => (
    currentChartData.datasets[0].data[maxValueIndex]
  ), [currentChartData, maxValueIndex])

  // endregion


  // region [Privates]
  const initializeTooltip = useCallback(() => {

    // 데이터가 있을 때 초기화
    setTimeout(() => {

      if (currentChartData.labels.length > 0 && chartRef.current) {
        chartRef.current?.tooltip?.setActiveElements([{ datasetIndex: 0, index: maxValueIndex }], { x: 0, y: 0 });
        chartRef.current?.update();
      }
    }, 300);
  }, [maxValueIndex, currentChartData]);
  // endregion


  // region [Styles]
  const chartCardButtonClass = useCallback((value: HashrateChartIntervalType) => {

    const clazz = ["market-chart__button"];

    if (hashrateChartInterval === value) {
      clazz.push("market-chart__button--active");
    }

    return clazz.join(" ");
  }, [hashrateChartInterval]);
  // endregion


  // region [Templates]
  const TopLogoArea = useMemo(() => (
    <div className="market-chart__top__fist__logo">
      <KIcon icon="bitcoin" color={isDark ? '#fff' : '#000'} size={30} />
      <p className="market-chart__top__wrapper__text__area">
        <span className="market-chart__top__wrapper__text__area--top">Bitcoin</span>
        <span className="market-chart__top__wrapper__text__area--bottom">Hashrate</span>
      </p>
    </div>
  ), []);


  const ButtonIntervalArea = useMemo(() => (
    <KButtonGroup className="market-chart__top__first__button-area">
      {
        hashrateChartIntervalOptions.map(({ value, text }) => (
          <KButton key={value} label={text} size="small" className={chartCardButtonClass(value)}
                   onClick={() => setHashrateChartInterval(value)} />
        ))
      }
    </KButtonGroup>
  ), [setHashrateChartInterval, chartCardButtonClass]);


  const ChartArea = useMemo(() => (
    <>
      <Line ref={chartRef} data={currentChartData} height="120%"
            className="market-chart__chart__wrapper__body"
            options={{
              plugins: {
                legend: { display: false },
                tooltip: {
                  enabled: true,
                  usePointStyle: true,
                  caretPadding: 6,
                  callbacks: { label: (ctx) => formatHashrate(ctx.raw as number) }
                }
              },
              elements: { point: { radius: 0 }, line: { tension: 0.3, borderWidth: 2 } },
              scales: { x: { display: false }, y: { display: false, suggestedMax: maxValue * 1.005 } },
              animation: {
                duration: 800,
                easing: "easeInOutQuart",
                onComplete: initializeTooltip
              }
            }}
      />
      <div className="market-chart__chart__wrapper__line__area">
        {Array.from({ length: 9 }, (_, i) => (
          <span key={i} style={{ "left": `${(i + 1) * 10}%` }}
                className="market-chart__chart__wrapper__line__area--line" />
        ))}
      </div>
    </>
  ), [maxValue, currentChartData, initializeTooltip]);
  // endregion


  return (
    <HorizontalCard className="market-chart">

      <div className="market-chart__top">
        <div className="market-chart__top__fist">
          {TopLogoArea}
          {ButtonIntervalArea}
        </div>
      </div>

      <div className="market-chart__bottom">{ChartArea}</div>

    </HorizontalCard>
  );
};


export default memo(HashrateChart);
