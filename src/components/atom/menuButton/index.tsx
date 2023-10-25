import { memo } from 'react'
import { IconButton } from '@mui/material'
import { HiMenuAlt2 } from 'react-icons/hi'

const MenuButton = () => {
  return (
    <IconButton sx={{ width: '32px', height: '32px', padding: '0', margin: '0' }}>
      <HiMenuAlt2 size={26} />
    </IconButton>
  )
}

export default memo(MenuButton)
