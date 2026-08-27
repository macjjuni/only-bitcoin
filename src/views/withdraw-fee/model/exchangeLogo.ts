import type { ExchangeId } from "@/entities/exchange";

export const EXCHANGE_LOGO: Record<ExchangeId, string> = {
  upbit: "/images/logo/upbit-logo.webp",
  bithumb: "/images/logo/bithumb-icon.webp",
  korbit: "/images/logo/korbit-icon.webp",
  binance: "/images/logo/binance-icon.webp",
  kraken: "/images/logo/kraken-icon.webp",
};

/** 원형 로고라 그대로 두면 모서리가 각져 보이는 거래소. */
const ROUNDED_LOGO_EXCHANGES: Set<ExchangeId> = new Set(["bithumb", "binance", "kraken"]);

export const resolveLogoClassName = (exchangeId: ExchangeId) =>
  ROUNDED_LOGO_EXCHANGES.has(exchangeId) ? "shrink-0 rounded-full" : "shrink-0";
