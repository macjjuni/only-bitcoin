


/** 📌 Rules!
 * 1. 설정(ex: 테마)값 업데이트 함수는 변경된 값을 그대로 리턴하도록 작성
 */

export interface StoreType {
  btc: BtcProps; // BTC 시세 정보
  updateKRW: (by: UpdateKRWProps) => void;
  updateUSD: (by: UpdateUSDProps) => void;

  btcChart: BtcChart;
  setBtcChart: (interval: MarketChartIntervalType, data: ChartData) => void;

  dominance: DominanceProps; // 도미넌스 정보
  updateDominance: (by: UpdateDominanceProps) => void;

  market: MarketType; // 메인 시세 단위 => 'KRW' | 'USD' | 'KRW/USD'
  setMarket: (market: MarketType) => MarketType;

  theme: ThemeTypes;
  setTheme: (theme: ThemeTypes) => void;

  exRate: ExRateProps; // USD/KRW 환율 데이터
  setExRate: (exRate: ExRateProps) => void;

  amount: string; // BTC 개수 Input 값
  setAmount: (by: string) => void;

  isCountAnime: boolean; // 가격 변동 애니메이션 효과 여부
  setCountAnime: (bool: boolean) => void;

  fearGreed: FearGreedProps; // 공포&탐욕 지수
  updateFearGreed: (data: FearGreedProps) => void;

  isLottiePlay: boolean; // 메인 로티 애니메이션
  toggleLottie: () => void;

  blockData: BlockProps; // 블록 생성 정보
  updateBlock: (blockData: BlockProps) => void; // 블록 생성 정보 업데이트

  marketChartInterval: MarketChartIntervalType; // 대시보드 차트 인터벌
  setMarketChartInterval: (interval: MarketChartIntervalType) => void; // 대시보드 차트 인터벌

  isUsdtRateEnabled: boolean;
  setUsdtRateEnabled: (isUsdtRateEnabled: boolean) => void;
}



export interface BtcProps {
  krw: number;
  krwDate: string;
  krwColor: boolean;
  isKrwStatus: boolean;
  usd: number;
  usdDate: string;
  usdColor: boolean; // true = green, false = red
  isUsdStatus: boolean;
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
  isKrwStatus: boolean;
}

export interface UpdateUSDProps {
  usd: number;
  usdDate: string;
  usdColor: boolean;
  isUsdStatus: boolean;
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
