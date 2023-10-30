import { memo } from 'react'
// useRef, useCallback, useEffect
import { Stack, Typography } from '@mui/material'
import { type LottieProps } from 'react-lottie-player'
import { useBearStore } from '@/zustand/store'
import LottieItem from '@/components/LottieItem'
// import { getBtcRecentBlockHeight } from '@/api/mempool'
import BlockLottie1 from '@/assets/block1.json'

// const intervalTime = 120000 // Interval Time(ms): 2분

const defaultOption: LottieProps = { loop: true, play: true }
const lottieOption = { ...defaultOption, style: { width: '80px', height: '80px' } }

const BlockView = () => {
  // const timerRef = useRef<NodeJS.Timer | null>()
  const { blockData } = useBearStore((state) => state)

  // // 비트코인 최신 블록 데이터 초기화
  // const updateBlockHeight = useCallback(async () => {
  //   console.log('블록 조회 실행')
  //   const { height, timeStamp } = await getBtcRecentBlockHeight()
  //   updateBlock({
  //     height,
  //     timeStamp,
  //     updateTimeStamp: Number(new Date()),
  //   })
  // }, [])

  // // 일정 기간동안 반복 실행
  // const intervalRun = useCallback((func: () => void) => {
  //   timerRef.current = setInterval(async () => {
  //     func()
  //   }, intervalTime)
  // }, [])

  // // 업데이트 시간 체크해서 업데이트 실행
  // const updateCheck = useCallback(() => {
  //   if (blockData.height === 0) updateBlockHeight()
  //   else {
  //     const now = Date.now()
  //     const timeDiff = now - blockData.updateTimeStamp
  //     if (timeDiff >= intervalTime) updateBlockHeight() // 업데이트한지 2분 이후면 업데이트 재실행
  //   }
  // }, [])

  // useEffect(() => {
  //   updateCheck()
  //   intervalRun(updateBlockHeight)
  // }, [])

  return (
    <Stack mb="-60px" display="flex" flexDirection="row" justifyContent="flex-end" alignItems="center" maxWidth="400px" width="100%">
      <LottieItem play option={lottieOption} animationData={BlockLottie1} speed={1} />
      <Typography fontSize={20} fontWeight="bold" letterSpacing="0.64px" ml="-8px" mr="8px">
        {blockData.height}
      </Typography>
    </Stack>
  )
}

export default memo(BlockView)
