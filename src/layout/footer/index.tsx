import { memo, useState } from 'react'
import { Box, Typography, Link, IconButton } from '@mui/material'
import CopyrightIcon from '@mui/icons-material/Copyright'
import CopyDialog from '@/components/CopyDialog'

const Footer = () => {
  const [open, setOpen] = useState(false)

  return (
    <>
      <Box
        component="footer"
        sx={{
          position: 'fixed',
          bottom: '0',
          left: '0',
          width: '100%',
          height: '50px',
          display: 'flex',
          justifyContent: 'flex-end',
          alignItems: 'center',
        }}
      >
        <Typography variant="h2" sx={{ fontSize: '14px', color: '#474E68', textAlign: 'right', padding: '0 12px' }}>
          <IconButton
            aria-label="delete"
            size="small"
            onClick={() => {
              setOpen(true)
            }}
          >
            <CopyrightIcon fontSize="inherit" />
          </IconButton>
          <Link href="https://kku.dev" underline="hover" target="_blank" sx={{ position: 'relative', top: '1px', color: '#393E46' }}>
            kku.dev
          </Link>
        </Typography>
        <CopyDialog open={open} setOpen={setOpen} />
      </Box>
    </>
  )
}

export default memo(Footer)
