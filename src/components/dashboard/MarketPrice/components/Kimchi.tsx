import { useCallback, useLayoutEffect, useState } from 'react'
import { Box, Tooltip } from '@mui/material'
import { TbSquareRoundedLetterK } from 'react-icons/tb'
import CountText from '@/components/CountText'

import { calcPerDiff } from '@/utils/common'
import { getExRate } from '@/api/exRate'
import { type IExRate, type IBtc } from '@/zustand/type'

interface IKimchi {
  btc: IBtc
  exRate: IExRate
  isAnime: boolean
  setExRate: (exRate: IExRate) => void
}

const Kimchi = ({ btc, exRate, setExRate, isAnime }: IKimchi) => {
  const [isTooltip, setTooltip] = useState(false)
  const getFetchExRate = async () => {
    const resExRate = await getExRate()
    setExRate(resExRate)
  }

  const toggleTooptip = useCallback(() => {
    setTooltip((prev) => !prev)
  }, [isTooltip])

  useLayoutEffect(() => {
    getFetchExRate()
  }, [])

  if (exRate.basePrice === 0) {
    console.error('환율 데이터 에러')
    return null
  }

  return (
    <>
      <Tooltip title="한국 프리미엄" placement="top" arrow open={isTooltip} onClick={toggleTooptip}>
        <Box position="absolute" top="-28px" right="0px" display="flex" flexDirection="row" justifyContent="flex-end" alignItems="center" height={30} gap="4px" sx={{ cursor: 'pointer' }}>
          <TbSquareRoundedLetterK fontSize={22} />
          <CountText text={calcPerDiff(btc.krw, btc.usd, exRate.basePrice)} className="price-txt-sm kimchi" duration={0.3} percent decimals={2} isAnime={isAnime} />
        </Box>
      </Tooltip>
    </>
  )
}

export default Kimchi
