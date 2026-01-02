export const KRW_MARKET_LIST = ['UPBIT', 'BITHUMB'];
export type KrwMarketType = typeof KRW_MARKET_LIST[number]

export const USD_MARKET_LIST = ['BINANCE', 'COINBASE'];
export type UsdMarketType = typeof USD_MARKET_LIST[number]

export const UPBIT_MARKET_FLAG: KrwMarketType = 'UPBIT' as const;
export const BITHUMB_MARKET_FLAG: KrwMarketType = 'BITHUMB' as const;
export const BINANCE_MARKET_FLAG: UsdMarketType = 'BINANCE' as const;
export const COINBASE_MARKET_FLAG: UsdMarketType = 'COINBASE' as const;
