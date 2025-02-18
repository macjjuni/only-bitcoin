import { MarketChartIntervalType } from "@/shared/stores/store.interface";

export interface ChartJsDataType {
  labels: string[];
  datasets: {
    label: string;
    data: number[];
    borderColor?: string;
    backgroundColor?: string;
    borderWidth?: number;
    pointBackgroundColor?: string;
  }[];
}

export interface ChartData {
  date: number[];
  price: number[];
  timeStamp: number;
}


export type BtcChart = {
  [K in MarketChartIntervalType]: ChartData;
};

export interface MarketChartIntervalTypeList {
  text: string;
  value: MarketChartIntervalType;
}


export interface CoingeckoMarketChartParams {
  vs_currency: string;
  days: number;
}

export interface CoingeckoMarketChartResponseData {
  market_caps: Array<number[]>;
  prices: Array<number[]>;
  total_volumes: Array<number[]>;
}

export interface CoingeckoMarketChartFormattedData {
  price: number[];
  date: number[];
}
