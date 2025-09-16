import {KrwMarketType} from '@/shared/constants/market'

export interface StoreType {

  // region [비트코인 실시간 가격]
  bitcoinPrice: BitcoinPriceTypes; // BTC 시세 정보
  setBitcoinKrwPrice: (bitcoinPriceKRW: BitcoinPriceKRWTypes) => void;
  setBitcoinUsdPrice: (bitcoinPriceUSD: BitcoinPriceUSDTypes) => void;
  krwMarket: KrwMarketType;
  setKrwMarket: (market: KrwMarketType) => void;
  reconnectUpbit: () => void;
  reconnectBithumb: () => void;
  reconnectBinance: () => void;
  setReconnectUpbit: (fn: () => void) => void;
  setReconnectBithumb: (fn: () => void) => void;
  setReconnectBinance: (fn: () => void) => void;
  // endregion

  // region [대시보드 차트]
  marketChartInterval: MarketChartIntervalType;
  setMarketChartInterval: (interval: MarketChartIntervalType) => void;
  marketChartData: BtcChart;
  setMarketChartData: (interval: MarketChartIntervalType, data: ChartData) => void;
  // endregion

  // region [환율 데이터]
  exRate: ExRateTypes; // USD/KRW 환율 데이터
  setExRate: (exRate: ExRateTypes) => void;
  // endregion

  // region [블록정보]
  blockData: BlockTypes[];
  setBlockData: (blocks: BlockTypes[]) => void;
  fees: FeesTypes;
  setFees: (fees: FeesTypes) => void;
  // endregion

  // region [BTC2Fiat]
  btc2Fiat: { btcCount: string; krw: string; usd: string; sats: string; };
  setBtcCount: (btcCount: string) => void;
  setKrw: (krw: string) => void;
  setUsd: (usd: string) => void;
  setSats: (sats: string) => void;
  focusCurrency: UnitType;
  setFocusCurrency: (currency: UnitType) => void
  // endregion

  // region [즐겨찾기]
  setting: SettingTypes;
  setInitialPath: (path: string) => void;
  setCurrency: (currency: CurrencyTypes) => void;
  setUsdtStandard: (isUsdtStandard: boolean) => void;
  setIsCountUp: (isCountUp: boolean) => void;
  setIsBackgroundImg: (isBackgroundImg: boolean) => void;
  setDeferredPrompt: (deferredPrompt: BeforeInstallPromptEvent | null) => void;
  // endregion
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
  isCountUp: boolean;
  isBackgroundImg: boolean;
  deferredPrompt: BeforeInstallPromptEvent | null;
}

export interface FeesTypes {
  economyFee: number;
  fastestFee: number;
  halfHourFee: number;
  hourFee: number;
  minimumFee: number;
}

export interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export type UnitType = "BTC" | "USD" | "KRW" | "SATS";
