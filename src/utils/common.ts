import { v4 as uuidv4 } from 'uuid'
import moment from 'moment'

// -------------------- string 형식에 숫자만 포함됐는지 체크 --------------------
export const isStrNumber = (val: string): boolean => {
  return !Number.isNaN(Number(val))
}

export const comma = (num: string): string => {
  // 문자형이지만 숫자말고 문자가 포함된 경우 체크
  const numCheck = isStrNumber(num)
  if (numCheck) return num.replace(/\B(?<!\.\d*)(?=(\d{3})+(?!\d))/g, ',')
  console.error('숫자 이외에 문자열이 포함됨', num)
  return '0'
}

// iOS Safari 브라우저 구분
export const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent)
// NetWork Status 구분
export const isNetwork = () => window.navigator.onLine

// 복사
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

// 날짜 포멧
export const transDate = (timeStamp: string | number) => {
  return moment(timeStamp).format('YYYY-MM-DD HH:mm:ss')
}
// 현재 날짜
export const getNowDate = () => {
  return moment().format('YYYY-MM-DD HH:mm:ss')
}
