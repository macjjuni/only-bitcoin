import { memo } from 'react'
import { BiTransferAlt } from 'react-icons/bi'
import { btcColor } from '@/data/btcInfo'

const TransIcon = ({ size = 16, color = btcColor }: { size?: number; color?: string }) => {
  return <BiTransferAlt fontSize={size} color={color} />
}

export default memo(TransIcon)
