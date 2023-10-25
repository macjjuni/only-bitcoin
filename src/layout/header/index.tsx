import { useState, useCallback, type KeyboardEvent, type MouseEvent } from 'react'
import { Stack, AppBar, SwipeableDrawer, List, ListItem, ListItemText, ListItemButton } from '@mui/material'
import { layout } from '@/styles/style'
import MenuButton from '@/components/atom/menuButton'

import BtcDominance from '@/components/BtcDominance'
import ExRatePrice from '@/components/ExRatePrice'
import RefreshButton from '@/components/RefreshButton'
import FearGreed from '@/components/FearGreed'

const Header = () => {
  const [isOpen, setOpen] = useState(false)

  const toggleDrawer = useCallback(
    (open: boolean) => (event: KeyboardEvent | MouseEvent) => {
      if (event && event.type === 'keydown' && ((event as KeyboardEvent).key === 'Tab' || (event as KeyboardEvent).key === 'Shift')) return
      setOpen(open)
    },
    []
  )

  const onToggle = useCallback(() => {
    setOpen((prev) => !prev)
  }, [isOpen])

  return (
    <AppBar position="static" sx={{ boxShadow: 'none', background: 'inherit' }}>
      <Stack height={layout.header} flexDirection="row" alignItems="center" justifyContent="space-between">
        <Stack flexDirection="row" gap="8px" alignItems="center">
          <MenuButton onToggle={onToggle} />
          <BtcDominance />
          <ExRatePrice />
          <FearGreed />
        </Stack>
        <RefreshButton />
      </Stack>

      {/* 사이드 메뉴바 */}
      <SwipeableDrawer anchor="left" open={isOpen} onClose={toggleDrawer(false)} onOpen={toggleDrawer(true)}>
        <List sx={{ width: '220px' }}>
          {['All mail', 'Trash', 'Spam'].map((text) => (
            <ListItem key={text} disablePadding>
              <ListItemButton>
                <ListItemText primary={text} />
              </ListItemButton>
            </ListItem>
          ))}
        </List>
      </SwipeableDrawer>
    </AppBar>
  )
}

export default Header
