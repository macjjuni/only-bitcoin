export interface IBtc {
  krw: number
  krwDate: string
  krwColor: boolean
  usd: number
  usdDate: string
  usdColor: boolean // true = green, false = red
}

export type ThemeTypes = 'dark' | 'light'

// 도미넌스지수
export interface IDominance {
  value: string
  date: string
}
// 도미넌스 업데이트
export interface IUpdateDominance {
  value: string
  date: string
}

// 공포탐욕지수
export interface IfearGreed {
  value: string
  date: string
}

// BTC시세 업데이트
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

// 환율 정보
export interface IExRate {
  date: string
  provider: string
  basePrice: number
}

export interface IDropDown {
  [index: string]: boolean
}

export interface INextHalving {
  nextHalvingHeight: number //
  nextHalvingPredictedDate: number | string
  remainingHeight: number
}

// BTC Recent Block Height Data
export interface IBlock {
  height: number // 블록 높이
  timeStamp: number // 블록 생성 타임스탬프
  updateTimeStamp: number // 데이터 업데이트 타임스탬프
  halvingPercent: number // 반감기 진행률
  nextHalving: INextHalving
}

// MVRV Z-Score
export interface IMvrv {
  date: string
}

export type MarketType = 'KRW' | 'USD' | 'KRW/USD'
