import { Stack } from '@mui/material'
import TopDashboard from './components/TopDashboard'
import BtcToPrice from '@/pages/Home/components/BtcToPrice'

const Home = () => {
  return (
    <Stack direction="column" useFlexGap flexWrap="wrap" gap="1rem" maxWidth={400} width="100%" m="auto">
      <TopDashboard />
      <BtcToPrice />
    </Stack>
  )
}

export default Home
