import type { StateCreator } from "zustand";
import type { KrwMarketType, UsdMarketType } from "./market";

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

export interface BitcoinPriceTypes extends BitcoinPriceKRWTypes, BitcoinPriceUSDTypes {}

export interface PriceSlice {
  bitcoinPrice: BitcoinPriceTypes; // BTC 시세 정보
  setBitcoinKrwPrice: (bitcoinPriceKRW: BitcoinPriceKRWTypes) => void;
  setBitcoinUsdPrice: (bitcoinPriceUSD: BitcoinPriceUSDTypes) => void;
  krwMarket: KrwMarketType;
  setKrwMarket: (market: KrwMarketType) => void;
  usdMarket: UsdMarketType;
  setUsdMarket: (market: UsdMarketType) => void;
}

export const createPriceSlice: StateCreator<PriceSlice> = (set) => ({
  bitcoinPrice: {
    krw: 0,
    krwChange24h: "0",
    krwUpdateTimestamp: 0,
    isKrwConnected: false,
    usd: 0,
    usdChange24h: "0",
    usdUpdateTimestamp: 0,
    isUsdConnected: false,
  },
  setBitcoinKrwPrice: (krw) =>
    set(({ bitcoinPrice }) => ({
      bitcoinPrice: { ...bitcoinPrice, ...krw },
    })),
  setBitcoinUsdPrice: (usd) =>
    set(({ bitcoinPrice }) => ({
      bitcoinPrice: { ...bitcoinPrice, ...usd },
    })),

  krwMarket: "BITHUMB",
  setKrwMarket: (krwMarket) => set(() => ({ krwMarket })),
  usdMarket: "BINANCE",
  setUsdMarket: (usdMarket) => set(() => ({ usdMarket })),
});
