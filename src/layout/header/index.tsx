import { memo } from 'react'
import { Box, AppBar, Toolbar, IconButton } from '@mui/material'
import GitHubIcon from '@mui/icons-material/GitHub'

import Logo from '@/components/Logo'

const Header = () => {
  return (
    <>
      <AppBar position="static" sx={{ boxShadow: 'none', background: 'inherit' }}>
        <Toolbar
          className="header-wrap"
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <Logo />

          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <IconButton
              title="GitHub Repository"
              href="https://github.com/macjjuni/btc-price"
              target="_blank"
              size="small"
              sx={{
                height: '34px',
                padding: '0',
                borderRadius: '50%',
              }}
            >
              <GitHubIcon sx={{ color: '#000', fontSize: '34px' }} />
            </IconButton>
          </Box>
        </Toolbar>
      </AppBar>
    </>
  )
}

export default memo(Header)
