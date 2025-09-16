export const KRW_MARKET_LIST = ['UPBIT', 'BITHUMB'];
export type KrwMarketType = typeof KRW_MARKET_LIST[number]
export const UPBIT_MARKET_FLAG: KrwMarketType = 'UPBIT' as const;
export const BITHUMB_MARKET_FLAG: KrwMarketType = 'BITHUMB' as const;
