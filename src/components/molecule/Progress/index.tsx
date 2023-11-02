import { useMemo } from 'react'
import { Box, Typography, LinearProgress, LinearProgressProps } from '@mui/material'
import { btcColor } from '@/data/btcInfo'
import { useBearStore } from '@/store'
import { comma } from '@/utils/common'

const LinearProgressWithLabel = ({ value, end }: LinearProgressProps & { value: number; end: number }) => {
  return (
    <Box sx={{ display: 'flex', alignItems: 'center' }}>
      <Box sx={{ width: '100%', mr: 1, color: btcColor }}>
        <LinearProgress sx={{ height: '24px' }} color="inherit" variant="determinate" value={value} />
      </Box>
      <Box sx={{ minWidth: 40 }}>
        <Typography fontSize={12} pr={1} variant="body2">{`${comma(end?.toString())}`}</Typography>
      </Box>
    </Box>
  )
}

const Progress = () => {
  const blockData = useBearStore((state) => state.blockData)

  const calcPer = useMemo(() => {
    return Math.round(blockData.halvingPercent)
  }, [blockData])

  return (
    <Box sx={{ width: '100%' }} position="relative">
      <Box position="absolute" top="50%" left="0" fontSize={14} textAlign="right" pr={2} sx={{ width: `calc(${calcPer}% - 40px)`, translate: '0 -50%', zIndex: 1 }}>
        {calcPer}%
      </Box>
      <LinearProgressWithLabel value={calcPer} end={blockData.nextHalving.nextHalvingHeight} />
    </Box>
  )
}

export default Progress
