import { memo, useCallback, useEffect, useRef, useState } from "react";
import { Button, ButtonGroup } from "@mui/material";
import { CategoryScale, Chart as ChartJS, Legend, LinearScale, LineElement, PointElement, Tooltip } from "chart.js";
import { Line } from "react-chartjs-2";
import { ChartData, MarketChartDaysList } from "@/pages/dashboard/components/marketChart/marketChart.interface";
import { getBtcRangeData } from "@/api/coinGeckoChart";
import "./marketChart.scss";
import { useBearStore } from "@/store";

// Chart.js 컴포넌트 등록
ChartJS.register(CategoryScale, LinearScale, PointElement, Tooltip, Legend, LineElement);

const marketChartDays: MarketChartDaysList[] = [
  { text: "1D", value: 1 },
  { text: "1W", value: 7 },
  { text: "1M", value: 30 },
  { text: "1Y", value: 365 },
];

export const getChartDataset = (data: number[]) => {
  return {
    label: "",
    data,
    borderColor: "#fff",
    backgroundColor: "transparent",
    fill: true,
  };
};

function MarketChart() {
  // region [Hooks]
  const btcChart = useBearStore((state) => state.btcChart);
  const [days, setDays] = useState<1 | 7 | 30 | 365>(1);
  const [chartData, setChartData] = useState<ChartData>({
    labels: [],
    datasets: [],
  });

  const chartRef = useRef<ChartJS<"line", number[], string>>();
  // endregion

  // region [Styles]

  const isActiveButtonClass = useCallback(
    (value: number) => {
      if (days === value) {
        return "only-btc__button--active";
      }
      return "";
    },
    [days]
  );

  // endregion

  // region [Events]

  const onClickChangeDays = useCallback((day: 1 | 7 | 30 | 365) => {
    setDays(day);
  }, []);

  // endregion

  // region [Transaction]

  const getListBtcPrice = useCallback(() => {
    getBtcRangeData(days, btcChart[days])
      .then((data) => {
        setChartData({
          labels: data.date.map((timestamp) => new Date(timestamp).toLocaleDateString()), // 날짜를 라벨로 설정
          datasets: [getChartDataset(data.price)],
        });
      })
      .catch((error) => {
        console.error("Error fetching data:", error);
      });
  }, [days, btcChart]);

  // endregion

  // region [Effects]

  // useEffect(() => {
  //   if (isTablet !== null) {
  //     chartRef.current!.resize();
  //   }
  // }, [isTablet]);

  useEffect(() => {
    getListBtcPrice();
  }, [days]);

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
            // animations: {
            //   x: {
            //     type: "number",
            //     easing: "easeInOutQuart",
            //     duration: 1000,
            //     from: NaN, // NaN에서 시작하여 데이터의 처음 값으로 시작
            //     delay(ctx) {
            //       if (ctx.type !== "data" || ctx.mode !== "default") {
            //         return 0;
            //       }
            //       // 데이터 포인트의 총 개수
            //       const totalPoints = ctx.chart.data.datasets[0].data.length;
            //       // 각 데이터 포인트에 대한 지연 시간 계산
            //       const totalDuration = 1000; // 전체 애니메이션 시간 (1000ms)
            //       const delayPerPoint = totalDuration / totalPoints;
            //       return ctx.dataIndex * delayPerPoint;
            //     },
            //   },
            //   y: {
            //     type: "number",
            //     easing: "easeInOutQuart",
            //     duration: 1000,
            //     from: (ctx) => {
            //       if (ctx.type === "data" && ctx.mode === "default") {
            //         return ctx.chart.scales.y.getPixelForValue(0); // y 축의 시작점을 0으로 설정
            //       }
            //     },
            //   },
            // },
          }}
        />
      </div>
      <div className="only-btc__market-chart__button__group">
        <ButtonGroup variant="outlined" aria-label="Basic button group">
          {marketChartDays.map((marketChartDay) => (
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
