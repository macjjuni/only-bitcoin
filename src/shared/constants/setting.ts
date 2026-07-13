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

// 시작 페이지 서버 리다이렉트(`src/app/page.tsx`)에서 참조하는 쿠키 키
export const INITIAL_PATH_COOKIE_KEY = "initial_path" as const;
// 브라우저가 허용하는 최대치(Chrome 등은 쿠키 만료를 400일로 제한).
// 재방문 시 훅(`useInitializePage`)이 쿠키를 갱신하므로 실질적으로 만료되지 않는다.
export const INITIAL_PATH_COOKIE_MAX_AGE_DAYS = 400;
export const DEFAULT_INITIAL_PATH = "/overview" as const;

export const sourceOptions = [
  { label: "BTC", value: "Upbit, Bithumb, Binance, Coinbase" },
  { label: "Dominance", value: "Coin Gecko" },
  { label: "Fear & Greed Index", value: "alternative.me" },
  { label: "USD/KRW Exchange Rate", value: "Naver(KEB)" },
] as const;
