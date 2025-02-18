import React, { memo, useCallback, useEffect, useLayoutEffect, useMemo, useRef } from "react";
import { CategoryScale, Chart as ChartJS, Legend, LinearScale, LineElement, PointElement, Tooltip } from "chart.js";
import { Line } from "react-chartjs-2";
import { KButton } from "kku-ui";

import { ChartJsDataType, MarketChartIntervalTypeList } from "@/widgets/pages/overview/chartCard/ChartCard.interface";
import { btcColor } from "@/shared/constants/color";
import { BitcoinIcon, TriangleDownIcon, TriangleUpIcon } from "@/shared/icons";
import { initializeCoingeckoMarketChart } from "@/widgets/pages/overview/chartCard/ChartCard.api";
import { MarketChartIntervalType } from "@/shared/stores/store.interface";
import { comma } from "@/shared/utils/string";
import useStore from "@/shared/stores/store";
import "./ChartCard.scss";
import HorizontalCard from "@/widgets/pages/overview/card/horizontalCard/HorizontalCard";


// Chart.js 컴포넌트 등록
ChartJS.register(CategoryScale, LinearScale, PointElement, Tooltip, Legend, LineElement);

const marketChartIntervalOptions: MarketChartIntervalTypeList[] = [
  { text: "1D", value: 1 },
  { text: "1W", value: 7 },
  { text: "1M", value: 30 },
  { text: "1Y", value: 365 }
];

const getChartDataset = (data: number[], index: number) => {

  return {
    label: "", data, borderColor: "#fff", backgroundColor: "transparent",
    borderWidth: 2, pointBackgroundColor: btcColor, pointHoverRadius: 4,
    pointRadius: data.map((_, idx) => (idx === index ? 4 : 0)) // 최댓값 위치에 점 표시
  };
};


const ChartCard = () => {


  // region [Hooks]

  const chartRef = useRef<ChartJS<"line", number[], string>>(null);
  const usdPrice = useStore(state => state.bitcoinPrice.usd);

  const marketChartInterval = useStore(state => state.marketChartInterval);
  const setMarketChartInterval = useStore(state => state.setMarketChartInterval);
  const marketChartData = useStore(state => state.marketChartData);
  const maxValueIndex = useMemo(() => {
    const dataList = marketChartData[marketChartInterval].price;

    const maxValue = dataList.reduce((max, val) => (val > max ? val : max), -Infinity);

    return dataList.indexOf(maxValue);
  }, [marketChartData, marketChartInterval]);

  const currentChartData = useMemo((): ChartJsDataType => {

    const currentData = marketChartData[marketChartInterval];

    return {
      labels: currentData.date.map((timestamp) => new Date(timestamp).toLocaleDateString()),
      datasets: [getChartDataset(currentData.price, maxValueIndex)]
    };
  }, [marketChartData, marketChartInterval, maxValueIndex]);

  const percentage = useMemo(() => {

    const factor = 10 ** 2;
    const maxValue = currentChartData.datasets[0].data[maxValueIndex];
    const percentValue = (usdPrice - maxValue) / Math.abs(usdPrice) * 100;

    return Math.floor(percentValue * factor) / factor;
  }, [usdPrice, currentChartData, maxValueIndex]);

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


  // region [Templates]

  const ButtonIntervalArea = useMemo(() => (
    <div className="chart-card__top__first__button-area">
      {
        marketChartIntervalOptions.map(({ value, text }) => (
          <KButton key={value} label={text} variant="contained" size="small"
                   onClick={() => setMarketChartInterval(value)} className={chartCardButtonClass(value)} />
        ))
      }
    </div>
  ), [setMarketChartInterval, chartCardButtonClass]);


  const ChartArea = useMemo(() => (
    <>
      <Line
        ref={chartRef}
        data={currentChartData}
        className="chart-card__chart__wrapper__body"
        height="120%"
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
    </>
  ), [currentChartData]);


  const UpdownIcon = useMemo(() => (

    percentage > 0 ? <TriangleUpIcon size={8} /> : <TriangleDownIcon size={8} />
  ), [percentage]);

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

          {ButtonIntervalArea}

        </div>

        <div className="chart-card__top__second">
          <span className="chart-card__top__second__price">
            {`$${comma(usdPrice)}`}
          </span>

          <span className="chart-card__top__second__rate">
            {UpdownIcon}
            {Math.abs(percentage)}%
          </span>
        </div>
      </div>

      <div className="chart-card__bottom">
        {ChartArea}
      </div>

    </HorizontalCard>
  );
};


export default memo(ChartCard);
