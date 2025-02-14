import React, { memo, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { CategoryScale, Chart as ChartJS, Legend, LinearScale, LineElement, PointElement, Tooltip } from "chart.js";
import { Line } from "react-chartjs-2";
import { KButton } from "kku-ui";
import HorizontalCard from "@/widgets/overview/card/horizontalCard/HorizontalCard";
import {
  ChartJsDataType,
  MarketChartIntervalTypeList
} from "@/widgets/overview/chartCard/ChartCard.interface";
import "./ChartCard.scss";
import { mockData } from "@/widgets/overview/chartCard/mockData";
import { btcColor } from "@/shared/constants";
import { BitcoinIcon } from "../../../shared/icons";
import { initializeCoingeckoMarketChart } from "@/widgets/overview/chartCard/ChartCard.api";
import useStore from "@/shared/stores/store";
import { MarketChartIntervalType } from "@/shared/stores/store.interface";
import { comma } from "@/shared/utils/string";


// Chart.js 컴포넌트 등록
ChartJS.register(CategoryScale, LinearScale, PointElement, Tooltip, Legend, LineElement);

const marketChartIntervalType: MarketChartIntervalTypeList[] = [
  { text: "1D", value: 1 },
  { text: "1W", value: 7 },
  { text: "1M", value: 30 },
  { text: "1Y", value: 365 }
];

const getChartDataset = (data: number[], index: number) => {

  return {
    label: "", data, borderColor: "#fff", backgroundColor: "transparent",
    borderWidth: 2, pointBackgroundColor: btcColor, pointHoverRadius: 4,
    pointRadius: data.map((_, idx) => (idx === index ? 6 : 0)) // 최댓값 위치에 점 표시
  };
};


const ChartCard = () => {


  // region [Hooks]

  const chartRef = useRef<ChartJS<"line", number[], string>>(null);

  const marketChartInterval = useStore(state => state.marketChartInterval);
  const setMarketChartInterval = useStore(state => state.setMarketChartInterval);
  const marketChartData = useStore(state => state.marketChartData);

  const maxValueIndex = useMemo(() => {

    const dataList = mockData[marketChartInterval].price;

    return dataList.indexOf(Math.max(...dataList));
  }, [mockData, marketChartInterval]);

  const currentChartData = useMemo((): ChartJsDataType => {

    const currentData = marketChartData[marketChartInterval];

    return {
      labels: currentData.date.map((timestamp) => new Date(timestamp).toLocaleDateString()),
      datasets: [getChartDataset(currentData.price, maxValueIndex)]
    };
  }, [marketChartData, marketChartInterval, maxValueIndex]);

  const maxValue = useMemo(() => (
    comma(currentChartData.datasets[0].data[maxValueIndex])
  ), [currentChartData, maxValueIndex]);

  // endregion


  // region [Events]

  // const onClickChangeDays = useCallback((day: 1 | 7 | 30 | 365) => {
  //     setMarketChartInterval(day);
  //   },
  //   [setMarketChartInterval]
  // );

  // endregion


  // region [Privates]

  const initializeTooltip = useCallback(() => {

    // 데이터가 있을 때 초기화
    if (currentChartData.labels.length > 0 && chartRef.current) {
      chartRef.current?.tooltip?.setActiveElements([{ datasetIndex: 0, index: maxValueIndex }], { x: 0, y: 0 });
      chartRef.current?.update();
    }
  }, [maxValueIndex, currentChartData]);

  // endregion


  // region [Styles]

  const chartCardButtonClass = useCallback((value: MarketChartIntervalType) => {

    const clazz = ["chart-card__button"];

    if (marketChartInterval === value) {
      clazz.push("chart-card__button--active");
    }

    return clazz.join(" ");
  }, [marketChartInterval]);

  // endregion


  // region[Life Cycles]

  useEffect(() => initializeTooltip(), [marketChartInterval]);

  useLayoutEffect(() => {
    initializeCoingeckoMarketChart(marketChartInterval).then();
  }, [marketChartInterval]);

  // endregion

  return (
    <HorizontalCard className="chart-card">

      <div className="chart-card__top">

        <div className="chart-card__top__fist">

          <div className="chart-card__top__fist__logo">
            <BitcoinIcon size={30} />
            <p className="chart-card__top__wrapper__text__area">
              <span className="chart-card__top__wrapper__text__area--top">Bitcoin</span>
              <span className="chart-card__top__wrapper__text__area--bottom">BTC</span>
            </p>
          </div>

          <div className="chart-card__top__first__button-area">
            {
              marketChartIntervalType.map(({ value, text }) => (
                <KButton key={value} label={text} variant="contained" size="small"
                         onClick={() => setMarketChartInterval(value)} className={chartCardButtonClass(value)} />
              ))
            }
          </div>
        </div>

        <div className="chart-card__top__second">
          <span className="chart-card__top__second__price">
            {`$${maxValue}`}
          </span>
          {/* <span className="chart-card__top__second__price__rate">11.3%</span> */}
        </div>
      </div>

      <div className="chart-card__bottom">
        <Line
          ref={chartRef}
          data={currentChartData}
          className="chart-card__chart__wrapper__body"
          height="116%"
          options={{
            plugins: { legend: { display: false }, tooltip: { enabled: true } },
            elements: { point: { radius: 0 }, line: { tension: 0.4, borderWidth: 2 } },
            scales: { x: { display: false }, y: { display: false } },
            animation: { duration: 800, easing: "easeInOutQuart" }
          }}
        />
        <div className="chart-card__chart__wrapper__line__area">
          {
            Array.from({ length: 9 }, (_, i) => (
              <span key={i} className="chart-card__chart__wrapper__line__area--line"
                    style={{ "left": `${(i + 1) * 10}%` }} />
            ))
          }
        </div>
      </div>
    </HorizontalCard>
  );
};


export default memo(ChartCard);
