import { useCallback } from 'react'
import CountUp from 'react-countup'

interface ICount {
  text: number
  className?: string
  duration: number
  percent?: boolean
  decimals?: number
}

const CountText = ({ text, className, duration = 1, percent, decimals }: ICount) => {
  // 카운트다운 애니메이션 최소값
  const convertToZero = useCallback((num: number) => {
    const firstDigit = Math.floor(num / 10 ** Math.floor(Math.log10(num)))
    const convertedNumber = firstDigit * 10 ** Math.floor(Math.log10(num))
    return convertedNumber
  }, [])

  return (
    <>
      <CountUp className={className} start={!percent ? convertToZero(text) : 0} end={text} decimals={decimals} duration={duration} />
      {percent && <h4 className={className}>%</h4>}
    </>
  )
}

export default CountText
