import { CircularProgress } from '@mui/material'
import { memo } from 'react'

const Spinner = ({ size = 16 }: { size?: number }) => {
  return <CircularProgress size={size} />
}

export default memo(Spinner)
