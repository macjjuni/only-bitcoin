// 코인게코 API 엔드포인트
import { MarketChartFormattedData, MarketChartParams, MarketChartResponseData } from "@/api/coinGeckoChart.interface";
import { ChartData, MarketChartDays } from "@/store/store.interface";
import { bearStore } from "@/store";

const url = "https://api.coingecko.com/api/v3/coins/bitcoin/market_chart";

function isThreeMinutesPassed(timestamp: number): boolean {
  const THREE_MINUTES_IN_MS = 3 * 60 * 1000;
  return Math.abs(Date.now() - timestamp) >= THREE_MINUTES_IN_MS;
}

// Parameters
function createParams(params: MarketChartParams): URLSearchParams {
  return new URLSearchParams({
    vs_currency: params.vs_currency,
    days: params.days.toString(), // 숫자를 문자열로 변환
  });
}

const params: MarketChartParams = {
  vs_currency: "usd",
  days: 0,
};

export async function getBtcRangeData(days: MarketChartDays, chartData: ChartData): Promise<MarketChartFormattedData> {
  // 타임스탬프가 존재하지 않거나 3분이 지났는지 확인
  const isAllow = isThreeMinutesPassed(chartData.timeStamp);

  if (isAllow) {
    const searchParams = createParams({ ...params, days });

    try {
      const response = await fetch(`${url}?${searchParams.toString()}`);
      const data: MarketChartResponseData = await response.json();

      // 데이터 추출 및 가공
      const formattedData: MarketChartFormattedData = {
        price: data.prices.map((price) => price[1]),
        date: data.prices.map((price) => price[0]),
      };
      bearStore.setBtcChart(days, { ...formattedData, timeStamp: Date.now() });

      return formattedData;
    } catch (error) {
      console.error("Error fetching data:", error);
    }
  }

  return {
    price: chartData.price,
    date: chartData.date,
  };
}
