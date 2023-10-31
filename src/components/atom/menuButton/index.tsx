import { memo } from 'react'
import { IconButton, useMediaQuery } from '@mui/material'
import { HiMenuAlt2 } from 'react-icons/hi'
import { responsive } from '@/styles/style'

const MenuButton = ({ onToggle }: { onToggle: () => void }) => {
  const matches = useMediaQuery(`(min-width: ${responsive.mobile}px)`)

  return (
    <IconButton className="icon-btn" onClick={onToggle} sx={{ p: matches ? '6px' : '4px' }}>
      <HiMenuAlt2 size={30} />
    </IconButton>
  )
}

export default memo(MenuButton)
