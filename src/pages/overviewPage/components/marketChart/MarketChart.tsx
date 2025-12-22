import React, { memo, useCallback, useMemo, useRef } from "react";
import { CategoryScale, Chart as ChartJS, Legend, LinearScale, LineElement, PointElement, Tooltip } from "chart.js";
import { KButton } from "kku-ui";
import { Line } from "react-chartjs-2";
import {
  ChartJsDataType,
  MarketChartIntervalTypeList
} from "@/pages/overviewPage/components/marketChart/MarketChart.interface";
import { MarketChartIntervalType } from "@/shared/stores/store.interface";
import useStore from "@/shared/stores/store";
import { HorizontalCard } from "@/components";
import { useMarketChartData } from "@/shared/api";
import { ChartChanger } from "@/pages/overviewPage/components";
import "./MarketChart.scss";


// Chart.js 컴포넌트 등록
ChartJS.register(CategoryScale, LinearScale, PointElement, Tooltip, Legend, LineElement);

const marketChartIntervalOptions: MarketChartIntervalTypeList[] = [
  { text: "1D", value: 1 },
  { text: "1W", value: 7 },
  { text: "1M", value: 30 },
  { text: "1Y", value: 365 }
];

const getChartDataset = (data: number[], index: number, isDark: boolean) => ({
  label: "", data, borderColor: isDark ? "#fff" : "#000", backgroundColor: "transparent",
  borderWidth: 2, pointBackgroundColor: "#f7931a", pointHoverRadius: 4,
  pointRadius: data.map((_, idx) => (idx === index ? 4 : 0)) // 최댓값 위치에 점 표시
});


const MarketChart = () => {

  // region [Hooks]
  const chartRef = useRef<ChartJS<"line", number[], string>>(null);
  const marketChartInterval = useStore(state => state.marketChartInterval);
  const setMarketChartInterval = useStore(state => state.setMarketChartInterval);
  const { marketChartData } = useMarketChartData(marketChartInterval);
  const isDark = useStore(store => store.theme) === "dark";


  const maxValueIndex = useMemo(() => {

    const dataList = marketChartData?.price || [];
    const maxValue = dataList.reduce((max: number, val: number) => (val > max ? val : max), -Infinity);

    return dataList.indexOf(maxValue);
  }, [marketChartData, marketChartInterval]);


  const currentChartData = useMemo((): ChartJsDataType => ({

    labels: marketChartData?.date.map((timestamp: number) => new Date(timestamp).toLocaleDateString()) || [],
    datasets: [getChartDataset(marketChartData?.price || [], maxValueIndex, isDark)]
  }), [marketChartData, marketChartInterval, maxValueIndex]);

  const maxValue = useMemo(() => (
    currentChartData.datasets[0].data[maxValueIndex]
  ), [currentChartData, maxValueIndex]);
  // endregion


  // region [Privates]
  const initializeTooltip = useCallback(() => {
    if (currentChartData.labels.length > 0 && chartRef.current) {
      chartRef.current?.tooltip?.setActiveElements([{ datasetIndex: 0, index: maxValueIndex }], { x: 0, y: 0 });
      chartRef.current?.update();
    }
  }, [maxValueIndex, currentChartData]);
  // endregion


  // region [Styles]
  const chartCardButtonClass = useCallback((value: MarketChartIntervalType) => {

    const clazz = ["market-chart__button"];

    if (marketChartInterval === value) {
      clazz.push("market-chart__button--active");
    }

    return clazz.join(" ");
  }, [marketChartInterval]);
  // endregion


  return (
    <HorizontalCard className="market-chart">
      <div className="market-chart__top">
        <Line ref={chartRef} data={currentChartData} height="150%"
              className="market-chart__chart__wrapper__body"
              options={{
                plugins: {
                  legend: { display: false },
                  tooltip: {
                    enabled: true,
                    usePointStyle: true,
                    caretPadding: 6,
                    callbacks: { label: (e) => `$${(e.formattedValue)}` }
                  }
                },
                elements: { point: { radius: 0 }, line: { tension: 0.3, borderWidth: 2 } },
                scales: { x: { display: false }, y: { display: false, suggestedMax: maxValue * 1.005 } },
                animation: { duration: 800, easing: "easeInOutQuart", onComplete: initializeTooltip },
                transitions: { active: { animation: { duration: 0 } } },
                animations: {
                  x: { duration: 0 },
                  y: { duration: 0 }
                } as never
              }}
        />
      </div>
      <div className="market-chart__bottom">
        <div className="market-chart__bottom__buttons">
          {
            marketChartIntervalOptions.map(({ value, text }) => (
              <KButton key={value} size="sm" className={chartCardButtonClass(value)}
                       onClick={() => setMarketChartInterval(value)}>{text}</KButton>
            ))
          }
        </div>
        <ChartChanger />
      </div>
    </HorizontalCard>
  );
};


export default memo(MarketChart);
