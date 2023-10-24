import { memo } from 'react'
import { FaBitcoin } from 'react-icons/fa'
import { btcColor } from '@/data/btcInfo'

interface IBtcIcon {
  size: number
  color?: string
}

const BtcIcon = ({ size, color = btcColor }: IBtcIcon) => {
  return <FaBitcoin size={size || 28} color={color} />
}

export default memo(BtcIcon)
