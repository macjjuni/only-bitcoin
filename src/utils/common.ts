// -------------------- string 형식에 숫자만 포함됐는지 체크 --------------------
export const isStrNumber = (val: string): boolean => {
  return !Number.isNaN(Number(val))
}

export const comma = (num: string): string => {
  // 문자형이지만 숫자말고 문자가 포함된 경우 체크
  const numCheck = isStrNumber(num)
  if (numCheck) return num.replace(/\B(?<!\.\d*)(?=(\d{3})+(?!\d))/g, ',')
  console.error('숫자 이외에 문자열이 포함됨')
  return '0'
}

// iOS Safari 브라우저 구분
export const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent)

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
