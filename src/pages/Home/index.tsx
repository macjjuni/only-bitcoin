import { Stack } from '@mui/material'
import BlockView from '@/components/dashboard/BlockView'
import MarketPrice from '@/components/dashboard/MarketPrice'
import BtcToKrw from '@/components/dashboard/BtcToKrw'
import { useBearStore } from '@/zustand/store'

const Home = () => {
  // Zustand Store
  const { btc, market, isKimchi, exRate, setExRate, isEcoSystem } = useBearStore((state) => state)

  return (
    <Stack alignItems="center" gap={1} width="100%">
      <BlockView />
      <MarketPrice btc={btc} market={market} isKimchi={isKimchi} exRate={exRate} setExRate={setExRate} />
      <BtcToKrw btc={btc} isEcoSystem={isEcoSystem} />
    </Stack>
  )
}

export default Home
