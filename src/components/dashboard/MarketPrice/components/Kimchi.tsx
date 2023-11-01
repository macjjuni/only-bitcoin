import { useCallback, useMemo, useLayoutEffect, useState } from 'react'
import { Box } from '@mui/material'
import { TbSquareRoundedLetterK } from 'react-icons/tb'
import PopOver from './PopOver'
import CountText from '@/components/atom/CountText'
import { bearStore } from '@/zustand/store'

import { calcPerDiff } from '@/utils/common'
import { getExRate } from '@/api/exRate'
import { type IExRate, type IBtc } from '@/zustand/type'

interface IKimchi {
  btc: IBtc
  exRate: IExRate
  isAnime: boolean
}

const Kimchi = ({ btc, exRate, isAnime }: IKimchi) => {
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null)
  const handlePopoverOpen = useCallback((e: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(e.currentTarget)
  }, [])

  const handlePopoverClose = useCallback(() => {
    setAnchorEl(null)
  }, [])

  const getFetchExRate = useCallback(async () => {
    const resExRate = await getExRate()
    bearStore.setExRate(resExRate)
  }, [])

  useLayoutEffect(() => {
    getFetchExRate()
  }, [])

  const KIcon = useMemo(() => <TbSquareRoundedLetterK fontSize={22} />, [])

  if (exRate.basePrice === 0) {
    console.error('환율 데이터 에러')
    return null
  }

  return (
    <>
      <Box
        position="absolute"
        top="-32px"
        right="0px"
        display="flex"
        flexDirection="row"
        justifyContent="flex-end"
        alignItems="center"
        height={30}
        gap="4px"
        sx={{ cursor: 'pointer' }}
        onMouseEnter={handlePopoverOpen}
        onMouseLeave={handlePopoverClose}
      >
        {KIcon}
        <CountText text={calcPerDiff(btc.krw, btc.usd, exRate.basePrice)} className="price-txt-sm kimchi" duration={0.3} percent decimals={2} isAnime={isAnime} />
      </Box>
      <PopOver anchorEl={anchorEl} open={Boolean(anchorEl)} handlePopoverClose={handlePopoverClose} />
    </>
  )
}

export default Kimchi
