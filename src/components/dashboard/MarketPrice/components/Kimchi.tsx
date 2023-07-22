import { useLayoutEffect, useState, useCallback } from 'react'
import { Box } from '@mui/material'
import { TbSquareRoundedLetterK } from 'react-icons/tb'
import CountText from '@/components/CountText'

import { calcPerDiff } from '@/utils/common'
import { getExRate } from '@/api/exRate'
import ExRateDialog from '@/components/modal/ExRateDialog'
import { type IExRate, type IBtc } from '@/zustand/type'

interface IKimchi {
  btc: IBtc
  exRate: IExRate
  setExRate: (exRate: IExRate) => void
}

const Kimchi = ({ btc, exRate, setExRate }: IKimchi) => {
  const [isEx, setEx] = useState(false)

  const showDialog = useCallback(() => {
    setEx(true)
  }, [isEx])

  const getFetchExRate = async () => {
    const resExRate = await getExRate()
    setExRate(resExRate)
  }

  useLayoutEffect(() => {
    getFetchExRate()
  }, [])

  if (exRate.basePrice === 0) {
    console.error('환율 데이터 에러')
    return null
  }

  return (
    <>
      <Box
        onClick={showDialog}
        position="absolute"
        top="-24px"
        right="0px"
        display="flex"
        flexDirection="row"
        justifyContent="flex-end"
        alignItems="center"
        height={30}
        gap="4px"
        sx={{ cursor: 'pointer' }}
      >
        <TbSquareRoundedLetterK fontSize={22} />
        <CountText text={calcPerDiff(btc.krw, btc.usd, exRate.basePrice)} className="price-txt-sm kimchi" duration={0.3} percent decimals={2} />
      </Box>
      <ExRateDialog open={isEx} setOpen={setEx} kimpPrice={calcPerDiff(btc.krw, btc.usd, exRate.basePrice)} />
    </>
  )
}

export default Kimchi
