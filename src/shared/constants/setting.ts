import { CurrencyTypes } from "@/shared/stores/store.interface";

interface CurrencyOptionTypes {
  text: string;
  value: CurrencyTypes
}
export const currencyOptions: CurrencyOptionTypes[] = [
  { text: 'KRW/USD' , value: 'KRW/USD' },
  { text: 'USD' , value: 'USD' },
  { text: 'KRW' , value: 'KRW' },
]

export const PWA_COOKIE_KEY = 'install' as const;
