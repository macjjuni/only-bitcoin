import { memo } from 'react'
import { Stack, AppBar } from '@mui/material'
// import Topbanner from '@/components/TopBanner'
import RefreshButton from '@/components/RefreshButton'
import { layout } from '@/styles/style'

const Header = () => {
  return (
    <AppBar position="static" sx={{ boxShadow: 'none', background: 'inherit' }}>
      {/* <Topbanner /> */}
      <Stack height={layout.header} flexDirection="row" alignItems="center" justifyContent="flex-end">
        <RefreshButton />
      </Stack>
    </AppBar>
  )
}

export default memo(Header)
