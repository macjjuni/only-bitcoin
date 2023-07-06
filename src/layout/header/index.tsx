import { memo } from 'react'
import { Stack, AppBar } from '@mui/material'
import RefreshButton from '@/components/RefreshButton'

const Header = () => {
  return (
    <>
      <AppBar position="static" sx={{ boxShadow: 'none', background: 'inherit' }}>
        <Stack height={64} flexDirection="row" alignItems="center" justifyContent="flex-end" padding="0 8px">
          <RefreshButton />
        </Stack>
      </AppBar>
    </>
  )
}

export default memo(Header)
