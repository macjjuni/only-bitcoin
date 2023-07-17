import { useLayoutEffect, useState, useCallback } from 'react'
import { Box } from '@mui/material'
import { BiSolidInfoCircle } from 'react-icons/bi'
import CountText from '@/components/CountText'
import { useBearStore } from '@/zustand/store'
import { calcPerDiff } from '@/utils/common'
import { getExRate } from '@/api/exRate'
import ExRateDialog from '@/components/modal/ExRateDialog'

const Kimchi = () => {
  const { exRate, btc, setExRate } = useBearStore((state) => state)
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
    return <></>
  }

  return (
    <>
      <Box onClick={showDialog} position="absolute" top="-28px" right="0px" display="flex" flexDirection="row" justifyContent="flex-end" alignItems="center" height={30} gap="4px" fontSize={20}>
        <BiSolidInfoCircle fontSize={20} className="kimchi-color kimchi-info" />
        <CountText text={calcPerDiff(btc.krw, btc.usd, exRate.basePrice)} className="kimchi-color" duration={0.3} percent decimals={2} />
      </Box>
      <ExRateDialog open={isEx} setOpen={setEx} kimpPrice={calcPerDiff(btc.krw, btc.usd, exRate.basePrice)} />
    </>
  )
}

export default Kimchi
