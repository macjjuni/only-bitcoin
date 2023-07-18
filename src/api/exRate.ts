import axios from 'axios'
import moment from 'moment'
import { toast } from 'react-toastify'
import { IExRate } from '@/zustand/store'

// 원달러 환율
const exRateUrl = 'https://quotation-api-cdn.dunamu.com/v1/forex/recent?codes=FRX.KRWUSD'

interface IExRateRes {
  basePrice: number | null
  cashBuyingPrice: number | null
  cashSellingPrice: number | null
  change: string
  changePrice: number | null
  changeRate: number | null
  code: string
  country: string
  createdAt: string
  currencyCode: string
  currencyName: string
  currencyUnit: number | null
  date: string
  exchangeCommission: number | null
  fcSellingPrice: null | number
  high52wDate: string
  high52wPrice: number | null
  highPrice: number | null
  id: number | null
  low52wDate: string
  low52wPrice: number | null
  lowPrice: number | null
  modifiedAt: string
  name: string
  openingPrice: number | null
  provider: string
  recurrenceCount: number | null
  signedChangePrice: null | number
  signedChangeRate: number | null
  tcBuyingPrice: null | number
  time: string
  timestamp: number | null
  ttBuyingPrice: number | null
  ttSellingPrice: number | null
  usDollarRate: number | null
}

export const getExRate = async (): Promise<IExRate> => {
  try {
    const res = await axios.get<IExRateRes[]>(exRateUrl)
    const { basePrice, modifiedAt, provider } = res.data[0]

    const ResponseData = {
      basePrice: basePrice || 0,
      date: moment(modifiedAt).format('yyyy-MM-DD HH:mm:ss'),
      provider,
    }
    return ResponseData
  } catch (e) {
    console.error(e)
    toast.error('환율 데이터를 가져올 수 없어 김치 프리미엄 데이터를 표시할 수 없습니다.')
    return {
      basePrice: 0,
      date: 'error',
      provider: 'error',
    }
  }
}
