import React, { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { CategoryScale, Chart as ChartJS, Legend, LinearScale, LineElement, PointElement, Tooltip } from "chart.js";
import { Line } from "react-chartjs-2";
import HorizontalCard from "@/widgets/overview/card/horizontalCard/HorizontalCard";
import { ChartJsDataType, MarketChartIntervalType, MarketChartIntervalTypeList } from "@/widgets/overview/chartCard/ChartCard.interface";
import "./ChartCard.scss";
import { mockData } from "@/widgets/overview/chartCard/mockData";
import { btcColor } from "@/shared/constants";
import { BitcoinIcon } from "@/shared/icon";


// Chart.js 컴포넌트 등록
ChartJS.register(CategoryScale, LinearScale, PointElement, Tooltip, Legend, LineElement);


// const marketChartIntervalType: MarketChartIntervalTypeList[] = [
//   { text: "1D", value: 1 },
//   { text: "1W", value: 7 },
//   { text: "1M", value: 30 },
//   { text: "1Y", value: 365 },
// ];


const ChartCard = () => {


  // region [Hooks]

  const chartRef = useRef<ChartJS<"line", number[], string>>(null);
  const [marketChartInterval, setMarketChartInterval] = useState<MarketChartIntervalType>(7);
  const maxValueIndex = useMemo(() => {

    const dataList = mockData[marketChartInterval].price;

    return dataList.indexOf(Math.max(...dataList));
  }, [mockData, marketChartInterval]);

  // endregion


  // region [Events]

  // const onClickChangeDays = useCallback((day: 1 | 7 | 30 | 365) => {
  //     setMarketChartInterval(day);
  //   },
  //   [setMarketChartInterval]
  // );

  // endregion


  // region [Privates]

  const getChartDataset = useCallback((data: number[], index: number) => {

    return {
      label: "",
      data,
      borderColor: "#fff",
      backgroundColor: "transparent",
      borderWidth: 2,
      pointBackgroundColor: btcColor,
      pointHoverRadius: 4,
      pointRadius: data.map((_, idx) => (idx === index ? 6 : 0)), // 최댓값 위치에 점 표시
    };
  }, []);

  const initializeTooltip = useCallback(() => {

    if (chartRef.current) {
      setTimeout(() => {
        chartRef.current?.tooltip?.setActiveElements([{ datasetIndex: 0, index: maxValueIndex }], { x: 0, y: 0});
        chartRef.current?.update();
      },  800);
    }
  }, [maxValueIndex]);

  // endregion


  // region [Templates]

  const currentChartData = useMemo((): ChartJsDataType => {

    const currentData = mockData[marketChartInterval];

    return {
      labels: currentData.date.map((timestamp) => new Date(timestamp).toLocaleDateString()),
      datasets: [getChartDataset(currentData.price, maxValueIndex)]
    };
  }, [marketChartInterval, maxValueIndex]);

  // endregion


  // region[Life Cycles]

  useEffect(() => {

    initializeTooltip();
  }, [marketChartInterval]);

  // endregion

  return (
    <HorizontalCard className="chart-card">
      <h3 className="chart-card__top__wrapper">
        <BitcoinIcon size={32} />
        <p className="chart-card__top__wrapper__text__area">
          <span className="chart-card__top__wrapper__text__area--top">Bitcoin</span>
          <span className="chart-card__top__wrapper__text__area--bottom">BTC</span>
        </p>
      </h3>
      <Line
        ref={chartRef}
        data={currentChartData}
        className="chart-card__chart__wrapper"
        height="100%"
        options={{
          plugins: { legend: { display: false }, tooltip: { enabled: true, position: 'average'} },
          elements: { point: { radius: 0 }, line: { tension: 0.4, borderWidth: 2 } },
          scales: { x: { display: false }, y: { display: false } },
          animation: { duration: 800, easing: "easeInOutQuart" }
        }}
      />
    </HorizontalCard>
  );
};

export default memo(ChartCard);
