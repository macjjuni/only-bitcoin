import { MarketChartDays } from "@/store/store.interface";

export interface ChartData {
  labels: string[];
  datasets: {
    label: string;
    data: number[];
    borderColor: string;
    backgroundColor: string;
    fill: boolean;
  }[];
}

export interface MarketChartDaysList {
  text: string;
  value: MarketChartDays;
}
