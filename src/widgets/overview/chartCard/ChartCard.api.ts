import { CoingeckoMarketChartFormattedData, CoingeckoMarketChartParams, CoingeckoMarketChartResponseData } from "./ChartCard.interface";
import { MarketChartIntervalType } from "@/shared/stores/store.interface";
import useStore from "@/shared/stores/store";

const url = "https://api.coingecko.com/api/v3/coins/bitcoin/market_chart";

function isFiveMinutesPassed(timestamp: number): boolean {

  const FIVE_MINUTES_IN_MS = 5 * 60 * 1000;
  return Math.abs(Date.now() - timestamp) >= FIVE_MINUTES_IN_MS;
}

// Parameters
function generateParams(params: CoingeckoMarketChartParams): URLSearchParams {
  
  return new URLSearchParams({
    vs_currency: params.vs_currency,
    days: params.days.toString(), // 숫자를 문자열로 변환
  });
}

const params: CoingeckoMarketChartParams = {
  vs_currency: "usd",
  days: 0,
};


export async function initializeCoingeckoMarketChart(days: MarketChartIntervalType) {

  const chartData = useStore.getState().marketChartData[days];
  const { setMarketChartData } = useStore.getState();

  // 타임스탬프가 존재하지 않거나 3분이 지났는지 확인
  const isAllow = isFiveMinutesPassed(chartData.timeStamp);

  if (isAllow) {

    const searchParams = generateParams({ ...params, days });

    try {
      const response = await fetch(`${url}?${searchParams.toString()}`);
      const data: CoingeckoMarketChartResponseData = await response.json();

      // 데이터 추출 및 가공
      const formattedData: CoingeckoMarketChartFormattedData = {
        date: data.prices.map((price) => price[0]),
        price: data.prices.map((price) => Math.floor(price[1])),
      };

      setMarketChartData(days, { ...formattedData, timeStamp: Date.now() });
    } catch (error) {
      console.error("Error fetching data:", error);
    }
  } else {
    // 기존 데이터 다시 덮어씌우기
    setMarketChartData(days, { ...chartData });
  }
}
