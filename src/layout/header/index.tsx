import { memo } from 'react'
import { Stack, AppBar } from '@mui/material'
import RefreshButton from '@/components/RefreshButton'

// Lottie File
import Logo from '@/components/Logo'

const Header = () => {
  return (
    <>
      <AppBar position="static" sx={{ boxShadow: 'none', background: 'inherit' }}>
        <Stack height={64} flexDirection="row" alignItems="center" justifyContent="space-between" padding="0 8px">
          <Logo />
          <RefreshButton />
        </Stack>
      </AppBar>
    </>
  )
}

export default memo(Header)
