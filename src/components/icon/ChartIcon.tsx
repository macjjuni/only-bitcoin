import { memo } from 'react'
import { FcAreaChart } from 'react-icons/fc'
import { btcColor } from '@/data/btcInfo'

const ChartIcon = ({ size = 16, color = btcColor }: { size?: number; color?: string }) => {
  return <FcAreaChart size={size} color={color} />
}

export default memo(ChartIcon)
