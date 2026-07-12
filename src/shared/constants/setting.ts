import type { CurrencyTypes } from "@/shared/stores/slices/settingSlice";

interface CurrencyOptionTypes {
  label: string;
  value: CurrencyTypes;
}

export const currencyOptions: CurrencyOptionTypes[] = [
  { label: "KRW/USD", value: "KRW/USD" },
  { label: "USD", value: "USD" },
  { label: "KRW", value: "KRW" },
];

export const PWA_COOKIE_KEY = "install" as const;
export const NOTICE_COOKIE_KEY = "notice" as const;

export const sourceOptions = [
  { label: "BTC", value: "Upbit, Bithumb, Binance, Coinbase" },
  { label: "Dominance", value: "Coin Gecko" },
  { label: "Fear & Greed Index", value: "alternative.me" },
  { label: "USD/KRW Exchange Rate", value: "Naver(KEB)" },
] as const;
