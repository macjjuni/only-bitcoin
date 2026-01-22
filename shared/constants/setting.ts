import { CurrencyTypes } from "@/shared/stores/store.interface";
import {BITHUMB_MARKET_FLAG, KrwMarketType, UsdMarketType, UPBIT_MARKET_FLAG,
  BINANCE_MARKET_FLAG, COINBASE_MARKET_FLAG} from '@/shared/constants/market'


interface CurrencyOptionTypes {
  label: string;
  value: CurrencyTypes
}

export const currencyOptions: CurrencyOptionTypes[] = [
  { label: 'KRW/USD' , value: 'KRW/USD' },
  { label: 'USD' , value: 'USD' },
  { label: 'KRW' , value: 'KRW' },
]
export const krwMarketOptions: { label: string; value: KrwMarketType }[] = [
  { label: '업비트' , value: UPBIT_MARKET_FLAG },
  { label: '빗썸' , value: BITHUMB_MARKET_FLAG },
]
export const usdMarketOptions: { label: string; value: UsdMarketType }[] = [
  { label: '바이낸스' , value: BINANCE_MARKET_FLAG },
  { label: '코인베이스' , value: COINBASE_MARKET_FLAG },
]

export const PWA_COOKIE_KEY = 'install' as const;
export const QUIZ_COOKIE_KEY = '_ga_ss_v2' as const;
export const NOTICE_COOKIE_KEY = 'notice' as const;

export const sourceOptions = [
  { label: "BTC", value: "Upbit, Bithumb, Binance, Coinbase" },
  { label: "Dominance & Chart", value: "Coin Gecko" },
  { label: "Fear & Greed Index", value: "alternative.me" },
  { label: "USD/KRW Exchange Rate", value: "Naver(KEB)" }
] as const;