import type { WithdrawAsset } from "@/entities/exchange";

export const ASSET_THEME = {
  BTC: {
    tab: "border-bitcoin bg-bitcoin/10 text-bitcoin",
    badge: "bg-bitcoin/10 text-bitcoin",
    fee: "text-bitcoin",
  },
  USDT: {
    tab: "border-tether bg-tether/10 text-tether",
    badge: "bg-tether/10 text-tether",
    fee: "text-tether",
  },
} as const satisfies Record<WithdrawAsset, Record<string, string>>;
