import { useCallback, memo, CSSProperties } from 'react'
import CountUp from 'react-countup'

interface ICount {
  text: number
  className?: string
  duration: number
  percent?: boolean
  decimals?: number
  isAnime: boolean
  style?: CSSProperties
}

const CountText = ({ text, className, duration = 1, percent, decimals, isAnime, style }: ICount) => {
  // 카운트다운 애니메이션 최소값
  const convertToZero = useCallback((num: number) => {
    const firstDigit = Math.floor(num / 10 ** Math.floor(Math.log10(num)))
    const convertedNumber = firstDigit * 10 ** Math.floor(Math.log10(num))
    return convertedNumber
  }, [])

  const getStartText = () => {
    if (!isAnime) return text
    if (!percent) return convertToZero(text)
    return 0
  }

  return (
    <>
      <CountUp className={className} style={style} start={getStartText()} end={text} decimals={decimals} duration={isAnime ? duration : 0} />
      {percent && <h4 className={className}>%</h4>}
    </>
  )
}

export default memo(CountText)
