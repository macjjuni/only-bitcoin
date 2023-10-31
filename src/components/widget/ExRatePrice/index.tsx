import { BiWon } from 'react-icons/bi'
import { useMediaQuery } from '@mui/material'
import ChipItem from '@/components/Chip'
import { useBearStore } from '@/zustand/store'
import { responsive } from '@/styles/style'
import { comma } from '@/utils/common'

const ExRatePrice = ({ onClick }: { onClick: () => void }) => {
  const matches = useMediaQuery(`(min-width: ${responsive.mobile}px)`)
  const { basePrice } = useBearStore((state) => state.exRate)

  return <ChipItem onClick={onClick} label={<BiWon size={matches ? 22 : 16} />} value={comma(basePrice?.toString())} />
}

export default ExRatePrice
