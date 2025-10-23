import React, { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { CategoryScale, Chart as ChartJS, Legend, LinearScale, LineElement, PointElement, Tooltip } from "chart.js";
import { KButton, KButtonGroup, KIcon, KSpinner } from "kku-ui";
import { Line } from "react-chartjs-2";
import {
  ChartJsDataType,
  MarketChartIntervalTypeList
} from "@/pages/overviewPage/components/hashrateChart/HashrateChart.interface";
import { HashrateChartIntervalType } from "@/shared/stores/store.interface";
import useStore from "@/shared/stores/store";
import { HorizontalCard } from "@/components";
import { useHashrateChartData } from "@/shared/api";
import { formatHashrate } from "@/shared/utils/number";
import { removeSpaces } from "@/shared/utils/string";
import "./HashrateChart.scss";


// Chart.js 컴포넌트 등록
ChartJS.register(CategoryScale, LinearScale, PointElement, Tooltip, Legend, LineElement);

const hashrateChartIntervalOptions: MarketChartIntervalTypeList[] = [
  { text: "3M", value: "3m" },
  { text: "1Y", value: "1y" },
  { text: "3Y", value: "3y" },
  { text: "All", value: "all" }
];

const getChartDataset = (data: number[], index: number, isDark: boolean) => ({
  label: "123", data, borderColor: isDark ? "#fff" : "#000", backgroundColor: "transparent",
  borderWidth: 2, pointBackgroundColor: "#f7931a",
  pointRadius: data.map((_, idx) => (idx === index ? 4 : 0)) // 최댓값 위치에 점 표시
});

const getFormatDate = (timestamp: number) => {
  return removeSpaces(new Date(timestamp * 1000).toLocaleDateString()).replace(/\.$/, '');
}


const HashrateChart = () => {

  // region [Hooks]
  const chartRef = useRef<ChartJS<"line", number[], string>>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const [blankHeight, setBlankHeight] = useState<number | 'auto'>(0);

  const hashrateChartInterval = useStore(state => state.hashrateChartInterval);
  const setHashrateChartInterval = useStore(state => state.setHashrateChartInterval);
  const { data, isLoading } = useHashrateChartData(hashrateChartInterval);

  const isDark = useStore(store => store.theme) === "dark";

  const maxValueIndex = useMemo(() => {
    const dataList = data?.hashrates.value || [];
    const maxValue = dataList.reduce((max: number, val: number) => (val > max ? val : max), -Infinity);

    return dataList.indexOf(maxValue);
  }, [data, hashrateChartInterval]);

  const maxHashrateValue = useMemo(() => {
    if (!data) { return '⚡'; }
    return formatHashrate(data.hashrates.value[maxValueIndex])
  }, [maxValueIndex, data])

  const currentChartData = useMemo((): ChartJsDataType => ({

    labels: data?.hashrates.date.map((timestamp: number) => new Date(timestamp * 1000).toLocaleDateString()) || [],
    datasets: [getChartDataset(data?.hashrates.value || [], maxValueIndex, isDark)]
  }), [data, hashrateChartInterval, maxValueIndex]);

  const maxValue = useMemo(() => (
    currentChartData.datasets[0].data[maxValueIndex]
  ), [currentChartData, maxValueIndex]);
  // endregion


  // region [Styles]
  const chartCardButtonClass = useCallback((value: HashrateChartIntervalType) => {

    const clazz = ["hashrate-chart__button"];

    if (hashrateChartInterval === value) { clazz.push("hashrate-chart__button--active"); }

    return clazz.join(" ");
  }, [hashrateChartInterval]);

  const xAxisValue = useMemo(() => {
    if (!data) { return { first: '-', middle: '-', last: '-' } }

    const dateList = data.hashrates.date;
    const firstItem = dateList[0];
    const middleItem = dateList[Math.floor(dateList.length / 2)] ;
    const lastItem = dateList[dateList.length - 1] ;

    return {
      first: getFormatDate(firstItem),
      middle: getFormatDate(middleItem),
      last: getFormatDate(lastItem),
    }
  }, [data])
  // endregion


  // region [Privates]
  const initializeBlankHeight = useCallback(() => {
    if (!cardRef?.current) {
      setBlankHeight('auto');
      return;
    }
    setBlankHeight(cardRef.current.clientWidth * 0.43)
  }, [])
  // endregion


  // region [Templates]
  const TopLogoArea = useMemo(() => (
    <div className="hashrate-chart__top__fist__logo">
      <KIcon icon="bitcoin" color={isDark ? "#fff" : "#000"} size={33} />
      <p className="hashrate-chart__top__wrapper__text__area">
        <span className="hashrate-chart__top__wrapper__text__area--top">Bitcoin</span>
        <span className="hashrate-chart__top__wrapper__text__area--bottom">Hashrate</span>
      </p>
    </div>
  ), []);


  const ButtonIntervalArea = useMemo(() => (
    <KButtonGroup className="hashrate-chart__top__first__button-area">
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
            className="hashrate-chart__chart__wrapper__body"
            options={{
              plugins: {
                legend: { display: false },
              },
              elements: { point: { radius: 0 }, line: { tension: 0.3, borderWidth: 2 } },
              scales: {
                x: { display: false },
                y: { display: false, suggestedMax: maxValue * 1.015 }
              },
              animation: { duration: 800, easing: "easeInOutQuart" }
            }}
      />
      <div className="hashrate-chart__chart__wrapper__line__area">
        {Array.from({ length: 16 }, (_, i) => (
          <span key={i} style={{ "left": `${(i + 1) * 6.25}%` }}
                className="hashrate-chart__chart__wrapper__line__area--line" />
        ))}
      </div>
    </>
  ), [maxValue, currentChartData]);
  // endregion


  useEffect(() => {
    initializeBlankHeight()
  }, []);


  return (
    <HorizontalCard ref={cardRef} className="hashrate-chart" rows={2}>

      <div className="hashrate-chart__top">
        <div className="hashrate-chart__top__fist">
          {TopLogoArea}
          {ButtonIntervalArea}
        </div>
      </div>


      <div className="hashrate-chart__bottom" style={{ height: isLoading ? blankHeight : 'auto' }}>

        {isLoading && <KSpinner className="hashrate-chart__bottom__spinner" />}
        {
          !isLoading && (
            <>
              {ChartArea}
              <div className="hashrate-chart__bottom__ATH">
                ATH:<span className="hashrate-chart__bottom__ATH__number">{maxHashrateValue}</span>
              </div>

              <div className="hashrate-chart__bottom__x">
                <span className="hashrate-chart__bottom__x__first">{xAxisValue.first}</span>
                <span className="hashrate-chart__bottom__x__middle">{xAxisValue.middle}</span>
                <span className="hashrate-chart__bottom__x__last">{xAxisValue.last}</span>
              </div>
            </>
          )
        }
      </div>

    </HorizontalCard>
  );
};


export default memo(HashrateChart);
