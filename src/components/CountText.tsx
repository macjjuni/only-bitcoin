import { useCallback } from 'react'
import CountUp from 'react-countup'

interface ICount {
  text: number
  className?: string
  duration: number
}

const CountText = ({ text, className, duration = 1 }: ICount) => {
  // 카운트다운 애니메이션 최소값
  const convertToZero = useCallback((num: number) => {
    const firstDigit = Math.floor(num / 10 ** Math.floor(Math.log10(num)))
    const convertedNumber = firstDigit * 10 ** Math.floor(Math.log10(num))
    return convertedNumber
  }, [])

  return <CountUp className={className} start={convertToZero(text)} end={text} duration={duration} />
}

export default CountText
