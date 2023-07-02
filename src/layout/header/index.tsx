import { memo } from 'react'
import { Stack, AppBar, Toolbar, IconButton } from '@mui/material'
import GitHubIcon from '@mui/icons-material/GitHub'

// Lottie File
import Logo from '@/components/Logo'

const Header = () => {
  return (
    <>
      <AppBar position="static" sx={{ boxShadow: 'none', background: 'inherit' }}>
        <Stack height={64} flexDirection="row" alignItems="center" justifyContent="space-between" padding="0 16px">
          <Logo />
          <Stack alignItems="center">
            <IconButton title="GitHub Repository" href="https://github.com/macjjuni/btc-price" target="_blank" size="small" sx={{ padding: '0', borderRadius: '50%' }}>
              <GitHubIcon fontSize="large" sx={{ color: '#000' }} />
            </IconButton>
          </Stack>
        </Stack>
      </AppBar>
    </>
  )
}

export default memo(Header)
