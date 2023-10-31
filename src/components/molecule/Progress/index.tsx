import { memo } from 'react'
import { Box, Typography, LinearProgress, LinearProgressProps } from '@mui/material'
import { btcColor } from '@/data/btcInfo'

const LinearProgressWithLabel = ({ value }: LinearProgressProps & { value: number }) => {
  return (
    <Box sx={{ display: 'flex', alignItems: 'center' }}>
      <Box sx={{ width: '100%', mr: 1, color: btcColor }}>
        <LinearProgress sx={{ height: '24px' }} color="inherit" variant="determinate" value={value} />
      </Box>
      <Box sx={{ minWidth: 35 }}>
        <Typography variant="body2">{`${Math.round(value)}%`}</Typography>
      </Box>
    </Box>
  )
}

const Progress = ({ value }: { value: number }) => {
  return (
    <Box sx={{ width: '100%' }}>
      <LinearProgressWithLabel value={value} />
    </Box>
  )
}

export default memo(Progress)
