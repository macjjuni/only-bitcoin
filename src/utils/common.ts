import { v4 as uuidv4 } from 'uuid'
import moment from 'moment'
import { ICurrency } from '@/api/dominance'

export const isDev = import.meta.env.MODE === 'development'

/* ---------- 값 체크 ---------- */
export const valueCheck = (val?: string | number | null | object) => {
  if (val === null || val === undefined || val === '') return false
  else {
    return true
  }
}

/* ---------- string 형식에 숫자만 포함됐는지 체크 ---------- */
export const isStrNumber = (val: string): boolean => {
  return !Number.isNaN(Number(val))
}
/* ---------- 천 단위 콤마 변환 ---------- */
export const comma = (num: string): string => {
  // 문자형이지만 숫자말고 문자가 포함된 경우 체크
  const numCheck = isStrNumber(num)
  if (numCheck) return num.replace(/\B(?<!\.\d*)(?=(\d{3})+(?!\d))/g, ',')
  console.error('숫자 이외에 문자열이 포함됨', num)
  return '0'
}

/* ---------- iOS Safari 브라우저 구분 ---------- */
export const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent)
/* ---------- NetWork Status 구분 ---------- */
export const isNetwork = () => window.navigator.onLine

/* ---------- 복사 기능 ---------- */
export const copyText = async (txt: string) => {
  return await navigator.clipboard
    .writeText(txt)
    .then(() => {
      return true
    })
    .catch((e) => {
      console.error(e)
      return false
    })
}

/* ---------- uuid 객체 ---------- */
export const uuid = {
  generate: () => {
    return uuidv4()
  },
  getUuid: () => {
    const savedUuid: string | null = localStorage.getItem('uuid')
    return savedUuid
  },
  saveUuid: (uuidTxt: string) => {
    localStorage.setItem('uuid', uuidTxt)
  },
}

const dateFormat = 'YYYY-MM-DD HH:mm:ss'
/* ---------- 날짜 포멧 변환 ---------- */
export const transDate = (dateStr: string | number | Date) => {
  return moment(dateStr).format(dateFormat)
}
export const transTimeStampDate = (timeStamp: string | number | Date) => {
  return moment.unix(Number(timeStamp)).format(dateFormat)
}
/* ---------- 현재 날짜 반환 ---------- */
export const getNowDate = () => {
  return moment().format(dateFormat)
}

export const getDateFormat = () => {
  return dateFormat
}

/* ---------- 김치 프리미엄 퍼센트 계산 ---------- */
export const calcPerDiff = (krwPrice: number, usdPrice: number, exRate: number) => {
  const basedUsdKRW = Math.floor(usdPrice * exRate) // 환율 * 비트코인 USD 시세
  const priceDiff = krwPrice - basedUsdKRW
  const per = (priceDiff / krwPrice) * 100

  return parseFloat(per.toFixed(2))
}

/* ---------- 비트코인 도미넌스 퍼센트 계산 ---------- */
export const getDominace = (list: ICurrency[]) => {
  // Initializes variables
  let BTCCap = 0
  let altCap = 0

  list.forEach((x) => {
    if (x.id === 'bitcoin') {
      BTCCap = x.market_cap
      altCap += x.market_cap
    } else {
      altCap += x.market_cap
    }
  })
  return ((BTCCap / altCap) * 100).toFixed(2)
}

// 반감기 진행률 계산
const blockDiff = 210000

export const calcProgress = (nextHalvingHeight: number, current: number) => {
  const remain = current % blockDiff
  console.log('remain', remain)
  console.log('blockDiff', blockDiff)

  return Math.round((remain / blockDiff) * 100 * 100) / 100 // 소수 둘 째 자리까지 남김
}

/* ---------- 비트코인 반감기까지 남은 블록개수 받아서 계산 후 일/시/분 문자열 반환 ---------- */
export const calcRemainingTime = (remainingBlock: number) => {
  const target = remainingBlock * 10 // 10 = 블록 채굴 평균 분
  const days = Math.floor(target / (24 * 60)) // 일(day) 계산
  const hours = Math.floor((target % (24 * 60)) / 60) // 시간(hour) 계산
  const remainingMinutes = target % 60 // 분(minute) 계산
  return `${days}일 ${hours}시간 ${remainingMinutes}분`
}
