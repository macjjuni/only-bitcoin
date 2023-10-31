import { memo, useEffect, useCallback, useState } from 'react'
import { Stack, Card, CardActions, CardContent, Typography, Divider } from '@mui/material'
import HalvingExpain from '@/components/molecule/HalvingExpain'
import HalvingTable from '@/components/molecule/HalvingTable'
import BtcIcon from '@/components/icon/BtcIcon'
import { useBearStore } from '@/zustand/store'
import { btcHalvingData } from '@/data/btcInfo'
import { transTimeStampDate } from '@/utils/common'
import CubeLottie from '@/components/dashboard/BlockView/components/CubeLottie'

interface IBlock {
  nextHalvingHeight: number | string
  nextHalvingPredictedDate: number | string
  remainingHeight: number
}

const avgMainingTime = 10

const calcRemainingTime = (remainingBlock: number) => {
  const target = remainingBlock * avgMainingTime //
  const days = Math.floor(target / (24 * 60)) // 일(day) 계산
  const hours = Math.floor((target % (24 * 60)) / 60) // 시간(hour) 계산
  const remainingMinutes = target % 60 // 분(minute) 계산
  return `${days}일 ${hours}시간 ${remainingMinutes}분`
}

const BitcoinHalvingTable = () => {
  const { blockData } = useBearStore((state) => state)
  const [nextHalving, setNextHalving] = useState<IBlock>({
    nextHalvingHeight: 0, // 다음 반감기 블록 높이
    nextHalvingPredictedDate: '', // 다음 반감기 예측 날짜
    remainingHeight: 0,
  })

  const getNextHalvingData = useCallback(() => {
    const nextHalv = btcHalvingData.find((Halving) => Halving.blockNum > blockData.height)
    setNextHalving({
      nextHalvingHeight: nextHalv?.blockNum || 0,
      nextHalvingPredictedDate: nextHalv?.date || '',
      remainingHeight: Number(nextHalv?.blockNum) - Number(blockData.height), // 다음 반감기까지 남은 블록 수
    })
  }, [])

  useEffect(() => {
    getNextHalvingData()
  }, [blockData])

  return (
    <Stack flexDirection="column" width="100%" height="100%" justifyContent="center">
      <Typography variant="h2" fontSize={24} fontWeight="bold" display="flex" justifyContent="flex-start" alignItems="center" gap="4px" mt="8px" mb="16px">
        <BtcIcon size={28} />
        비트코인 반감기
      </Typography>
      <Divider />
      <br />
      <HalvingExpain />

      {/* <Typography variant="h3" fontSize={20} fontWeight="bold" display="flex" justifyContent="flex-start" alignItems="center" gap="4px" mt="24px" mb="16px">
        반감기 카운트 다운
      </Typography> */}

      <Typography variant="h3" fontSize={20} fontWeight="bold" display="flex" justifyContent="flex-start" alignItems="center" gap="4px" mt="24px" mb="16px">
        실시간 블록 현황
      </Typography>

      <Stack direction="row" spacing={2} sx={{ pb: '16px', overflowX: 'auto' }}>
        <Card sx={{ minWidth: 200, width: '100%' }}>
          <CardContent>
            <Typography variant="h4" fontSize={16} gutterBottom>
              다음 반감기 블록 높이
            </Typography>
            <Stack direction="row" alignItems="center" spacing={1}>
              <CubeLottie />
              <Typography variant="h5" fontWeight="bold" gutterBottom>
                {nextHalving.nextHalvingHeight}
              </Typography>
            </Stack>
          </CardContent>
          <CardActions>
            <Typography component="div" fontSize={14} p="0 0 8px 8px">
              <b>예상시간</b>
              <br />
              {calcRemainingTime(nextHalving.remainingHeight)} ({nextHalving.nextHalvingPredictedDate})
            </Typography>
          </CardActions>
        </Card>
        <Card sx={{ minWidth: 200, width: '100%' }}>
          <CardContent>
            <Typography variant="h4" fontSize={16} gutterBottom>
              현재 블록 높이
            </Typography>
            <Stack direction="row" alignItems="center" spacing={1}>
              <CubeLottie />
              <Typography variant="h5" fontWeight="bold" gutterBottom>
                {blockData.height}
              </Typography>
            </Stack>
          </CardContent>
          <CardActions>
            <Typography component="div" fontSize={14} p="0 0 8px 8px">
              <b>타임스탬프</b>
              <br />
              {transTimeStampDate(blockData.timeStamp).replace(/-/g, '.')}
            </Typography>
          </CardActions>
        </Card>

        <Card sx={{ minWidth: 200, width: '100%' }}>
          <CardContent>
            <Typography variant="h4" fontSize={16} gutterBottom>
              다음 반감기까지 남은 블록
            </Typography>
            <Stack direction="row" alignItems="center" spacing={1}>
              <CubeLottie />
              <Typography variant="h5" fontWeight="bold" gutterBottom>
                {nextHalving.remainingHeight}
              </Typography>
            </Stack>
          </CardContent>
          <CardActions>
            <Typography component="div" fontSize={14} p="0 0 8px 8px" />
          </CardActions>
        </Card>
      </Stack>

      <Typography variant="h3" fontSize={20} fontWeight="bold" display="flex" justifyContent="flex-start" alignItems="center" gap="4px" mt="24px" mb="16px">
        반감기 표
      </Typography>
      <HalvingTable />
    </Stack>
  )
}

export default memo(BitcoinHalvingTable)
