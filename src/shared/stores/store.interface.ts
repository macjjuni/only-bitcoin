export interface StoreType {

  // region [비트코인 실시간 가격]

  bitcoinPrice: BitcoinPriceTypes; // BTC 시세 정보
  setBitcoinKrwPrice: (bitcoinPriceKRW: BitcoinPriceKRWTypes) => void;
  setBitcoinUsdPrice: (bitcoinPriceUSD: BitcoinPriceUSDTypes) => void;

  // endregion


  // region [대시보드 차트]

  marketChartInterval: MarketChartIntervalType;
  setMarketChartInterval: (interval: MarketChartIntervalType) => void;
  marketChartData: BtcChart;
  setMarketChartData: (interval: MarketChartIntervalType, data: ChartData) => void;

  // endregion


  // region [도미넌스]

  dominance: DominanceTypes;
  setDominance: (by: SetDominanceTypes) => void;

  // endregion


  // region [환율 데이터]

  exRate: ExRateTypes; // USD/KRW 환율 데이터
  setExRate: (exRate: ExRateTypes) => void;

  // endregion


  // region [공포탐욕지수]

  fearGreed: FearGreedTypes;
  setFearGreed: (data: FearGreedTypes) => void;

  // endregion


  // region [블록정보]

  blockData: BlockTypes[];
  setBlockData: (blocks: BlockTypes[]) => void;
  fees: FeesTypes;
  setFees: (fees: FeesTypes) => void;

  // endregion


  // region [즐겨찾기]

  setting: SettingTypes;
  setInitialPath: (path: string) => void;
  setCurrency: (currency: CurrencyTypes) => void;
  setUsdtStandard: (isUsdtStandard: boolean) => void;

  // endregion


  // market: MarketType; // 메인 시세 단위 => 'KRW' | 'USD' | 'KRW/USD'
  // setMarket: (market: MarketType) => MarketType;
  //

  //
  // amount: string; // BTC 개수 Input 값
  // setAmount: (by: string) => void;
  //
  // isCountAnime: boolean; // 가격 변동 애니메이션 효과 여부
  // setCountAnime: (bool: boolean) => void;
  //
  //
  // isLottiePlay: boolean; // 메인 로티 애니메이션
  // toggleLottie: () => void;
  //

  //
  // isUsdtRateEnabled: boolean;
  // setUsdtRateEnabled: (isUsdtRateEnabled: boolean) => void;
}


export interface BitcoinPriceTypes extends BitcoinPriceKRWTypes, BitcoinPriceUSDTypes {}


export interface BitcoinPriceKRWTypes {
  krw: number;
  krwChange24h: string;
  krwUpdateTimestamp: number;
  isKrwConnected?: boolean; // 웹 소켓 접속 여부(업비트)
}


export interface BitcoinPriceUSDTypes {
  usd: number;
  usdChange24h: string;
  usdUpdateTimestamp: number;
  isUsdConnected?: boolean; // 웹 소켓 접속 여부(바이낸스)
}


// 도미넌스지수
export interface DominanceTypes {
  value: number;
  timestamp: number;
}

// 도미넌스 업데이트
export interface SetDominanceTypes {
  value: number;
  timestamp: number;
}

// 공포탐욕지수
export interface FearGreedTypes {
  value: number;
  timestamp: number;
}


// 환율 정보
export interface ExRateTypes {
  value: number;
  date: string;
}

export interface NextHalvingTypes {
  nextHalvingHeight: number;
  nextHalvingPredictedDate: string;
  remainingHeight: number;
}

export interface BlockTypes {
  id: string;
  height: number; // 블록 높이
  timestamp: number; // 블록 생성 타임스탬프
  size: number;
  poolName: string;
  // nextHalving: NextHalvingTypes;
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

export type CurrencyTypes = "KRW" | "USD" | "KRW/USD";

export interface SettingTypes {
  initialPath: string;
  currency: CurrencyTypes;
  isUsdtStandard: boolean;
}

export interface FeesTypes {
  economyFee: number;
  fastestFee: number;
  halfHourFee: number;
  hourFee: number;
  minimumFee: number;
}
