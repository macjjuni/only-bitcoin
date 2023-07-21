import { Stack } from '@mui/material'
import MarketPrice from '@/components/dashboard/MarketPrice'
import BtcToKrw from '@/components/dashboard/BtcToKrw'
import { useBearStore } from '@/zustand/store'

const Home = () => {
  // Zustand Store
  const { btc, market, isKimchi, exRate, setExRate, isEcoSystem } = useBearStore((state) => state)

  return (
    <Stack alignItems="center">
      <MarketPrice btc={btc} market={market} isKimchi={isKimchi} exRate={exRate} setExRate={setExRate} />
      <BtcToKrw btc={btc} isEcoSystem={isEcoSystem} />
    </Stack>
  )
}

export default Home
