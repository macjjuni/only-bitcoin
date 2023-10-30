import { memo } from 'react'
// useRef, useCallback, useEffect
import { Stack, Typography } from '@mui/material'
import { type LottieProps } from 'react-lottie-player'
import LottieItem from '@/components/LottieItem'
import BlockLottie1 from '@/assets/block1.json'
import { IBlock } from '@/zustand/type'

const defaultOption: LottieProps = { loop: true, play: true }
const lottieOption = { ...defaultOption, style: { width: '80px', height: '80px' } }

const BlockView = ({ blockData }: { blockData: IBlock }) => {
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
