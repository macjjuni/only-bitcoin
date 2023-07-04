import { memo, useState } from 'react'
import { Stack, Link, IconButton } from '@mui/material'
import CopyrightIcon from '@mui/icons-material/Copyright'
import GitHubIcon from '@mui/icons-material/GitHub'
import CopyDialog from '@/components/CopyDialog'

const Footer = () => {
  const [open, setOpen] = useState(false)

  return (
    <>
      <Stack
        component="footer"
        flexDirection="row"
        justifyContent="flex-end"
        alignItems="center"
        px="16px"
        sx={{
          position: 'fixed',
          bottom: '0',
          left: '0',
          width: '100%',
          height: '50px',
        }}
      >
        <Stack component="div" flexDirection="row" alignItems="center" gap="2px" sx={{ color: '#474E68' }}>
          <IconButton
            aria-label="delete"
            size="small"
            onClick={() => {
              setOpen(true)
            }}
          >
            <CopyrightIcon fontSize="inherit" />
          </IconButton>

          <IconButton title="GitHub Repository" href="https://github.com/macjjuni/btc-price" target="_blank" sx={{ padding: '2px', borderRadius: '50%' }}>
            <GitHubIcon sx={{ color: '#000', fontSize: '16px' }} />
          </IconButton>

          <Link href="https://kku.dev" underline="hover" target="_blank" pl="4px" sx={{ position: 'relative', top: '1px', color: '#393E46' }}>
            kku.dev
          </Link>
        </Stack>
        <CopyDialog open={open} setOpen={setOpen} />
      </Stack>
    </>
  )
}

export default memo(Footer)
