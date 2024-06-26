export interface BtcProps {
  krw: number;
  krwDate: string;
  krwColor: boolean;
  usd: number;
  usdDate: string;
  usdColor: boolean; // true = green, false = red
}

export type ThemeTypes = "dark" | "light";

export type MarketType = "KRW" | "USD" | "KRW/USD";

// 도미넌스지수
export interface DominanceProps {
  value: string;
  date: string;
}

// 도미넌스 업데이트IfearGreed
export interface UpdateDominanceProps {
  value: string;
  date: string;
}

// 공포탐욕지수
export interface FearGreedProps {
  value: string;
  date: string;
}

// BTC시세 업데이트
export interface UpdateKRWProps {
  krw: number;
  krwDate: string;
  krwColor: boolean;
}

export interface UpdateUSDProps {
  usd: number;
  usdDate: string;
  usdColor: boolean;
}

// 환율 정보
export interface ExRateProps {
  date: string;
  provider: string;
  basePrice: number;
}

export interface NextHalvingProps {
  nextHalvingHeight: number; //
  nextHalvingPredictedDate: number | string;
  remainingHeight: number;
}

// BTC Recent Block Height Data
export interface BlockProps {
  height: number; // 블록 높이
  timeStamp: number; // 블록 생성 타임스탬프
  updateTimeStamp: number; // 데이터 업데이트 타임스탬프
  halvingPercent: number; // 반감기 진행률
  nextHalving: NextHalvingProps;
}

// 비트코인 차트 데이터
export interface ChartData {
  date: number[];
  price: number[];
  timeStamp: number;
}

export interface BtcChart {
  "1": ChartData;
  "7": ChartData;
  "30": ChartData;
  "365": ChartData;
}

export type MarketChartIntervalType = 1 | 7 | 30 | 365;

export type SetMarketChartIntervalType = (interval: MarketChartIntervalType) => void;
