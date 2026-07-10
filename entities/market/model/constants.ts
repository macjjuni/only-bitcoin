export const KRW_MARKET_LIST = ["UPBIT", "BITHUMB"];
export type KrwMarketType = (typeof KRW_MARKET_LIST)[number];

export const USD_MARKET_LIST = ["BINANCE", "COINBASE"];
export type UsdMarketType = (typeof USD_MARKET_LIST)[number];

export const UPBIT_MARKET_FLAG: KrwMarketType = "UPBIT" as const;
export const BITHUMB_MARKET_FLAG: KrwMarketType = "BITHUMB" as const;
export const BINANCE_MARKET_FLAG: UsdMarketType = "BINANCE" as const;
export const COINBASE_MARKET_FLAG: UsdMarketType = "COINBASE" as const;

export const krwMarketOptions: { label: string; value: KrwMarketType }[] = [
  { label: "업비트", value: UPBIT_MARKET_FLAG },
  { label: "빗썸", value: BITHUMB_MARKET_FLAG },
];
export const usdMarketOptions: { label: string; value: UsdMarketType }[] = [
  { label: "바이낸스", value: BINANCE_MARKET_FLAG },
  { label: "코인베이스", value: COINBASE_MARKET_FLAG },
];
