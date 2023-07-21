export interface IBtc {
  krw: number
  krwTime: string
  krwColor: boolean
  usd: number
  usdTime: string
  usdColor: boolean // true = green, false = red
}

export interface IUpdateKRW {
  krw: number
  krwTime: string
  krwColor: boolean
}

export interface IUpdateUSD {
  usd: number
  usdTime: string
  usdColor: boolean
}

export interface IExRate {
  date: string
  provider: string
  basePrice: number
}

export type MarketType = 'KRW' | 'USD' | 'KRW/USD'
