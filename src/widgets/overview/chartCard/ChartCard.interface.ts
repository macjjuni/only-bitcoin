

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


export type MarketChartIntervalType = 1 | 7 | 30 | 365;

export type BtcChart = {
  [K in MarketChartIntervalType]: ChartData;
};

export interface MarketChartIntervalTypeList {
  text: string;
  value: MarketChartIntervalType;
}
