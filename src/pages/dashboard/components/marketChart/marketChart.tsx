import { memo, useCallback, useEffect, useRef, useState } from "react";
import { Button, ButtonGroup } from "@mui/material";
import { CategoryScale, Chart as ChartJS, Legend, LinearScale, LineElement, PointElement, Tooltip } from "chart.js";
import { Line } from "react-chartjs-2";
import { ChartData, MarketChartIntervalTypeList } from "@/pages/dashboard/components/marketChart/marketChart.interface";
import { getBtcRangeData } from "@/api/coinGeckoChart";
import { useBearStore } from "@/store";
import "./marketChart.scss";
import { MarketChartIntervalType } from "@/store/store.interface";

// Chart.js 컴포넌트 등록
ChartJS.register(CategoryScale, LinearScale, PointElement, Tooltip, Legend, LineElement);

const marketChartIntervalType: MarketChartIntervalTypeList[] = [
  { text: "1D", value: 1 },
  { text: "1W", value: 7 },
  { text: "1M", value: 30 },
  { text: "1Y", value: 365 },
];

export const getChartDataset = (data: number[]) => {
  return { label: "", data, borderColor: "#fff", backgroundColor: "transparent", fill: true };
};

function MarketChart() {
  // region [Hooks]
  const btcChart = useBearStore((state) => state.btcChart);
  const marketChartInterval = useBearStore((state) => state.marketChartInterval);
  const setMarketChartInterval = useBearStore((state) => state.setMarketChartInterval);
  const [chartData, setChartData] = useState<ChartData>({
    labels: [],
    datasets: [],
  });

  const chartRef = useRef<ChartJS<"line", number[], string>>();
  // endregion

  // region [Styles]

  const isActiveButtonClass = useCallback(
    (interval: MarketChartIntervalType) => {
      if (marketChartInterval === interval) {
        return "only-btc__button--active";
      }
      return "";
    },
    [marketChartInterval]
  );

  // endregion

  // region [Events]

  const onClickChangeDays = useCallback(
    (day: 1 | 7 | 30 | 365) => {
      setMarketChartInterval(day);
    },
    [setMarketChartInterval]
  );

  // endregion

  // region [Transaction]

  const getListBtcPrice = useCallback(() => {
    getBtcRangeData(marketChartInterval, btcChart[marketChartInterval])
      .then((data) => {
        setChartData({
          labels: data.date.map((timestamp) => new Date(timestamp).toLocaleDateString()), // 날짜를 라벨로 설정
          datasets: [getChartDataset(data.price)],
        });
      })
      .catch((error) => {
        console.error("Error fetching data:", error);
      });
  }, [marketChartInterval, btcChart]);

  // endregion

  // region [Effects]

  useEffect(() => {
    getListBtcPrice();
  }, [marketChartInterval]);

  // endregion

  return (
    <>
      <div className="only-btc__market-chart">
        <Line
          ref={chartRef}
          data={chartData}
          options={{
            plugins: { legend: { display: false }, tooltip: { enabled: false } },
            elements: { point: { radius: 0 }, line: { tension: 0.16, borderWidth: 2.5 } },
            scales: { x: { display: false }, y: { display: false } },
            animation: { duration: 800, easing: "easeInOutQuart" },
          }}
        />
      </div>
      <div className="only-btc__market-chart__button__group">
        <ButtonGroup variant="outlined" aria-label="Basic button group">
          {marketChartIntervalType.map((marketChartDay) => (
            <Button key={marketChartDay.value} color="info" onClick={() => onClickChangeDays(marketChartDay.value)} className={`only-btc__button ${isActiveButtonClass(marketChartDay.value)}`}>
              {marketChartDay.text}
            </Button>
          ))}
        </ButtonGroup>
      </div>
    </>
  );
}

export default memo(MarketChart);
