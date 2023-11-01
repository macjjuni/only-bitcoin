import { memo, useEffect, useCallback, useState } from 'react'
import { Stack, Typography, Divider } from '@mui/material'
import HalvingExpain from '@/components/explain/HalvingExpain'
import HalvingTable from '@/components/molecule/HalvingTable'
import BtcIcon from '@/components/icon/BtcIcon'
import { useBearStore } from '@/zustand/store'
import { btcHalvingData } from '@/data/btcInfo'
import { transTimeStampDate, calcProgress, comma } from '@/utils/common'
import CubeLottie from '@/components/dashboard/BlockView/components/CubeLottie'
import CardItem from '@/components/molecule/CardItem'
import Progress from '@/components/molecule/Progress'

interface IBlock {
  nextHalvingHeight: number
  nextHalvingPredictedDate: number | string
  remainingHeight: number
}

// 블록 채굴 평균 분
const avgMainingTime = 10

// 예상시간 일 시간 분으로 계산
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

      <Typography variant="h3" fontSize={20} fontWeight="bold" display="flex" justifyContent="flex-start" alignItems="center" gap="4px" mt="24px" mb="16px">
        실시간 블록 현황
      </Typography>

      <Stack direction="row" spacing={2} sx={{ pb: '16px', overflowX: 'auto' }}>
        <CardItem
          title="다음 반감기 블록 높이"
          content={
            <>
              <CubeLottie />
              <Typography variant="h5" fontWeight="bold" gutterBottom>
                {comma(nextHalving.nextHalvingHeight?.toString())}
              </Typography>
            </>
          }
          bottom={
            <>
              <Typography fontSize={14} fontWeight="bold" mb="4px">
                예상시간
              </Typography>
              <div>
                {calcRemainingTime(nextHalving.remainingHeight)}({nextHalving.nextHalvingPredictedDate})
              </div>
            </>
          }
        />

        <CardItem
          title="현재 블록 높이"
          content={
            <>
              <CubeLottie />
              <Typography variant="h5" fontWeight="bold" gutterBottom>
                {comma(blockData.height?.toString())}
              </Typography>
            </>
          }
          bottom={
            <>
              <Typography fontSize={14} fontWeight="bold" mb="4px">
                타임스탬프
              </Typography>
              <div>{transTimeStampDate(blockData.timeStamp).replace(/-/g, '.')}</div>
            </>
          }
        />

        <CardItem
          title="다음 반감기까지 남은 블록"
          content={
            <>
              <CubeLottie />
              <Typography variant="h5" fontWeight="bold" gutterBottom>
                {comma(nextHalving.remainingHeight?.toString())}
              </Typography>
            </>
          }
          bottom={
            <>
              <Typography fontSize={14} fontWeight="bold" mb="4px">
                진행률
              </Typography>
              <Progress value={calcProgress(Number(nextHalving.nextHalvingHeight) - 210000, Number(nextHalving.nextHalvingHeight), blockData.height)} />
            </>
          }
        />
      </Stack>

      <Typography variant="h3" fontSize={20} fontWeight="bold" display="flex" justifyContent="flex-start" alignItems="center" gap="4px" mt="16px" mb="16px">
        반감기 표
      </Typography>
      <HalvingTable />
    </Stack>
  )
}

export default memo(BitcoinHalvingTable)
