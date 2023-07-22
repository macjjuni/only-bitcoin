import ChipItem from '@/components/Chip'
import { useBearStore } from '@/zustand/store'

import { comma } from '@/utils/common'

const ExRatePrice = () => {
  const { basePrice } = useBearStore((state) => state.exRate)

  return <ChipItem label="USD/KRW" value={comma(basePrice?.toString())} />
}

export default ExRatePrice
