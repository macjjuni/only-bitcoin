import { memo } from 'react'
import { PiCircleHalfDuotone } from 'react-icons/pi'
import { btcColor } from '@/data/btcInfo'

const HalfIcon = ({ size = 16, color = btcColor }: { size?: number; color?: string }) => {
  return <PiCircleHalfDuotone size={size} color={color} />
}

export default memo(HalfIcon)
