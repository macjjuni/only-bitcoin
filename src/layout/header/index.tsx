import { useState, useCallback, type KeyboardEvent, type MouseEvent, useEffect } from 'react'
import { Stack, AppBar, SwipeableDrawer, List, ListItem, ListItemText, ListItemButton } from '@mui/material'
import { useNavigate, useLocation } from 'react-router-dom'
import { layout } from '@/styles/style'
import MenuButton from '@/components/atom/menuButton'

import BtcDominance from '@/components/BtcDominance'
import ExRatePrice from '@/components/ExRatePrice'
import RefreshButton from '@/components/RefreshButton'
import FearGreed from '@/components/FearGreed'
import ExRateDialog from '@/components/modal/ExRateDialog'

import { routes } from '@/router'

const Header = () => {
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const [isEx, setEx] = useState(false) // 환율&김프 모달
  const [isOpen, setOpen] = useState(false)

  const toggleDrawer = useCallback(
    (open: boolean) => (event: KeyboardEvent | MouseEvent) => {
      if (event && event.type === 'keydown' && ((event as KeyboardEvent).key === 'Tab' || (event as KeyboardEvent).key === 'Shift')) return
      setOpen(open)
    },
    []
  )

  const showDialog = useCallback(() => {
    setEx(true)
  }, [isEx])

  const onToggle = useCallback(() => {
    setOpen((prev) => !prev)
  }, [isOpen])

  const onRoute = useCallback((path: string) => {
    navigate(path)
    setOpen(false)
  }, [])

  useEffect(() => {
    setOpen(false)
  }, [pathname])

  return (
    <>
      <AppBar position="static" sx={{ boxShadow: 'none', background: 'inherit' }}>
        <Stack height={layout.header} flexDirection="row" alignItems="center" justifyContent="space-between">
          <Stack flexDirection="row" gap="8px" alignItems="center">
            <MenuButton onToggle={onToggle} />
            <BtcDominance />
            <ExRatePrice onClick={showDialog} />
            <FearGreed />
          </Stack>
          <RefreshButton />
        </Stack>

        {/* 사이드 메뉴바 */}
        <SwipeableDrawer anchor="left" open={isOpen} onClose={toggleDrawer(false)} onOpen={toggleDrawer(true)}>
          <List sx={{ width: '220px' }}>
            {routes.map((route) => (
              <ListItem
                key={route.id}
                disablePadding
                onClick={() => {
                  onRoute(route.path)
                }}
              >
                <ListItemButton>
                  <ListItemText primary={route.title} />
                </ListItemButton>
              </ListItem>
            ))}
          </List>
        </SwipeableDrawer>
      </AppBar>
      {/* 한국 프리미엄 및 환율 정보 */}
      <ExRateDialog open={isEx} setOpen={setEx} />
    </>
  )
}

export default Header
