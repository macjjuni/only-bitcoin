import { Stack } from '@mui/material'
import BlockView from '@/components/dashboard/BlockView'
import MarketPrice from '@/components/dashboard/MarketPrice'
import BtcToKrw from '@/components/dashboard/BtcToKrw'
import { useBearStore } from '@/zustand/store'

const Home = () => {
  // Zustand Store
  const { btc, market, isKimchi, isLottiePlay, exRate, isEcoSystem, blockData } = useBearStore((state) => state)

  return (
    <Stack alignItems="center" gap={1} width="100%">
      <BlockView blockData={blockData} />
      <MarketPrice btc={btc} market={market} isKimchi={isKimchi} isLottiePlay={isLottiePlay} exRate={exRate} />
      <BtcToKrw btc={btc} isEcoSystem={isEcoSystem} />
    </Stack>
  )
}

export default Home
