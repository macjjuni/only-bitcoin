import { memo } from 'react'
import { IconButton } from '@mui/material'
import { HiMenuAlt2 } from 'react-icons/hi'

const MenuButton = ({ onToggle }: { onToggle: () => void }) => {
  return (
    <IconButton className="icon-btn" onClick={onToggle}>
      <HiMenuAlt2 size={28} />
    </IconButton>
  )
}

export default memo(MenuButton)
