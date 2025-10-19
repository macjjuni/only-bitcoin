import { CurrencyTypes } from "@/shared/stores/store.interface";
import {BITHUMB_MARKET_FLAG, KrwMarketType, UPBIT_MARKET_FLAG} from '@/shared/constants/market'

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
  { label: 'Upbit' , value: UPBIT_MARKET_FLAG },
  { label: 'Bithumb' , value: BITHUMB_MARKET_FLAG },
]

export const PWA_COOKIE_KEY = 'install' as const;
