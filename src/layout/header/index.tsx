import { Stack, AppBar } from '@mui/material'
import { layout } from '@/styles/style'
import MenuButton from '@/components/atom/menuButton'

import BtcDominance from '@/components/BtcDominance'
import ExRatePrice from '@/components/ExRatePrice'
import RefreshButton from '@/components/RefreshButton'
import FearGreed from '@/components/FearGreed'

const Header = () => {
  return (
    <AppBar position="static" sx={{ boxShadow: 'none', background: 'inherit' }}>
      <Stack height={layout.header} flexDirection="row" alignItems="center" justifyContent="space-between">
        <Stack flexDirection="row" gap="8px" alignItems="center">
          <MenuButton />
          <BtcDominance />
          <ExRatePrice />
          <FearGreed />
        </Stack>
        <RefreshButton />
      </Stack>
    </AppBar>
  )
}

export default Header
