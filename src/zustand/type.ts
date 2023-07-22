export interface IBtc {
  krw: number
  krwDate: string
  krwColor: boolean
  usd: number
  usdDate: string
  usdColor: boolean // true = green, false = red
}

export interface IDominance {
  value: string
  date: string
}

export interface IUpdateKRW {
  krw: number
  krwDate: string
  krwColor: boolean
}

export interface IUpdateUSD {
  usd: number
  usdDate: string
  usdColor: boolean
}

export interface IExRate {
  date: string
  provider: string
  basePrice: number
}

export interface IUpdateDominance {
  value: string
  date: string
}

export interface IDropDown {
  [index: string]: boolean
}

export type MarketType = 'KRW' | 'USD' | 'KRW/USD'
