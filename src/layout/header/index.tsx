import { useState, useCallback, type KeyboardEvent, type MouseEvent, useEffect } from 'react'
import { Stack, AppBar, SwipeableDrawer, List, ListItem, ListItemText, ListItemButton, Typography } from '@mui/material'
import { Link, useLocation } from 'react-router-dom'
import { layout } from '@/styles/style'
import MenuButton from '@/components/atom/menuButton'

import BtcDominance from '@/components/BtcDominance'
import ExRatePrice from '@/components/ExRatePrice'
import RefreshButton from '@/components/RefreshButton'
import FearGreed from '@/components/FearGreed'

const Header = () => {
  const { pathname } = useLocation()
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

  useEffect(() => {
    setOpen(false)
  }, [pathname])

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
          {/* {['All mail', 'Trash', 'Spam'].map((text) => (
            <ListItem key={text} disablePadding>
              <ListItemButton>
                <ListItemText primary={text} />
              </ListItemButton>
            </ListItem>
          ))} */}
          <ListItem disablePadding>
            <ListItemButton
              onClick={() => {
                setOpen(false)
              }}
            >
              <Link to="/">
                <ListItemText primary="Home" />
              </Link>
            </ListItemButton>
          </ListItem>
          <ListItem disablePadding>
            <ListItemButton
              onClick={() => {
                setOpen(false)
              }}
            >
              <Link to="/mvrv">
                <ListItemText primary="MVRV Z-Score" />
              </Link>
            </ListItemButton>
          </ListItem>
        </List>
      </SwipeableDrawer>
    </AppBar>
  )
}

export default Header
