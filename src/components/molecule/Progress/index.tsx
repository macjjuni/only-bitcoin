// import { useMemo } from 'react'
import { Box, Typography, LinearProgress, LinearProgressProps } from '@mui/material'
import { btcColor } from '@/data/btcInfo'
import { useBearStore } from '@/store'
import { comma } from '@/utils/common'

const LinearProgressWithLabel = ({ value, end, isMaxNum }: LinearProgressProps & { value: number; end: number; isMaxNum?: boolean }) => {
  return (
    <Box sx={{ display: 'flex', alignItems: 'center' }}>
      <Box sx={{ width: '100%', mr: 1, color: btcColor }}>
        <LinearProgress sx={{ height: '24px' }} color="inherit" variant="determinate" value={value} />
      </Box>
      {isMaxNum && (
        <Box sx={{ minWidth: 40 }}>
          <Typography fontSize={12} pr={1} variant="body2">{`${comma(end?.toString())}`}</Typography>
        </Box>
      )}
    </Box>
  )
}

const Progress = ({ isMaxNum }: { isMaxNum?: boolean }) => {
  const blockData = useBearStore((state) => state.blockData)

  return (
    <Box sx={{ width: '100%' }} position="relative">
      <Box position="absolute" top="50%" left="0" fontSize={14} textAlign="right" pr={1.5} sx={{ width: `calc(${blockData.halvingPercent}% - 40px)`, translate: '0 -50%', zIndex: 1 }}>
        {blockData.halvingPercent}%
      </Box>
      <LinearProgressWithLabel value={blockData.halvingPercent} end={blockData.nextHalving.nextHalvingHeight} isMaxNum={isMaxNum} />
    </Box>
  )
}

export default Progress
