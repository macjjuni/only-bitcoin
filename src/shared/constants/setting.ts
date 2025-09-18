import { CurrencyTypes } from "@/shared/stores/store.interface";
import {BITHUMB_MARKET_FLAG, KrwMarketType, UPBIT_MARKET_FLAG} from '@/shared/constants/market'

interface CurrencyOptionTypes {
  text: string;
  value: CurrencyTypes
}
export const currencyOptions: CurrencyOptionTypes[] = [
  { text: 'KRW/USD' , value: 'KRW/USD' },
  { text: 'USD' , value: 'USD' },
  { text: 'KRW' , value: 'KRW' },
]
export const krwMarketOptions: { text: string; value: KrwMarketType }[] = [
  { text: 'Upbit' , value: UPBIT_MARKET_FLAG },
  { text: 'Bithumb' , value: BITHUMB_MARKET_FLAG },
]

export const PWA_COOKIE_KEY = 'install' as const;
