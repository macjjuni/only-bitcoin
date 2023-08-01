import { memo, type Dispatch, type SetStateAction, type MouseEvent, useCallback } from 'react'
import { RiCloseCircleLine } from 'react-icons/ri'
import { DialogTitle, Dialog, Container, Typography, ToggleButtonGroup, ToggleButton, IconButton, Stack, Switch } from '@mui/material'
import { useBearStore } from '@/zustand/store'
import { type MarketType } from '@/zustand/type'

type DialogType = {
  open: boolean
  setOpen: Dispatch<SetStateAction<boolean>>
}

const threeButtons = [
  { value: 'KRW', width: '36px' },
  { value: 'USD', width: '36px' },
  { value: 'KRW/USD', width: '65px' },
]

const twoButtons = [
  { label: '보이기', value: true, width: '76px' },
  { label: '숨기기', value: false, width: '76px' },
]

const SettingDialog = ({ open, setOpen }: DialogType) => {
  const { market, setMarket, isEcoSystem, toggleEco, isKimchi, toggleKimchi, theme, toggleTheme, isFearGreed, setFearGreed } = useBearStore((state) => state)

  const closeDialog = useCallback(() => {
    setOpen(false)
  }, [])

  const marketChange = useCallback((e: MouseEvent<HTMLElement>, selectMarket: MarketType) => {
    if (selectMarket === null) return
    setMarket(selectMarket)
  }, [])

  const kimchiChange = useCallback((e: MouseEvent<HTMLElement>, flag: boolean) => {
    if (flag === null) return
    toggleKimchi(flag)
  }, [])

  const ecoChange = useCallback((e: MouseEvent<HTMLElement>, flag: boolean) => {
    if (flag === null) return
    if (flag) toggleEco(true)
    else toggleEco(false)
  }, [])

  const onToggleFearGreed = useCallback((e: MouseEvent<HTMLElement>, flag: boolean) => {
    if (flag === null) return
    setFearGreed(flag)
  }, [])

  const onToggleTheme = useCallback(() => {
    toggleTheme()
  }, [])

  return (
    <>
      <Dialog onClose={closeDialog} open={open} className="mui-dialog">
        <DialogTitle width="100%" minWidth={356} borderBottom="1px solid #a5a5a5" sx={{ padding: '12px 16px' }}>
          <Stack flexDirection="row" justifyContent="space-between" alignItems="center">
            <Typography component="p" fontSize={16} fontWeight="bold">
              설정
            </Typography>
            <IconButton onClick={closeDialog} sx={{ padding: '0' }}>
              <RiCloseCircleLine fontSize={24} />
            </IconButton>
          </Stack>
        </DialogTitle>
        <Container sx={{ padding: '16px' }}>
          <Stack flexDirection="column" justifyContent="flex-start" gap="8px">
            <Stack flexDirection="row" justifyContent="space-between" alignItems="center">
              <Typography fontSize={16} fontWeight="bold">
                🎨 다크모드
              </Typography>
              <Switch checked={theme === 'dark'} onChange={onToggleTheme} />
            </Stack>
            <Stack flexDirection="row" justifyContent="space-between" alignItems="center">
              <Typography fontSize={16} fontWeight="bold">
                💵 단위
              </Typography>
              <ToggleButtonGroup color="primary" value={market} exclusive onChange={marketChange} aria-label="Platform">
                {threeButtons.map((unit) => (
                  <ToggleButton key={unit.value} value={unit.value} size="small">
                    <Typography fontSize={14} fontWeight="bold" width={unit.width}>
                      {unit.value}
                    </Typography>
                  </ToggleButton>
                ))}
              </ToggleButtonGroup>
            </Stack>
            <Stack flexDirection="row" justifyContent="space-between" alignItems="center">
              <Typography fontSize={16} fontWeight="bold">
                🇰🇷 프리미엄
              </Typography>
              <ToggleButtonGroup color="primary" value={isKimchi} exclusive onChange={kimchiChange} aria-label="Platform">
                {twoButtons.map((unit) => (
                  <ToggleButton key={unit.label} value={unit.value} size="small">
                    <Typography fontSize={14} fontWeight="bold" width={unit.width}>
                      {unit.label}
                    </Typography>
                  </ToggleButton>
                ))}
              </ToggleButtonGroup>
            </Stack>
            <Stack flexDirection="row" justifyContent="space-between" alignItems="center">
              <Typography fontSize={16} fontWeight="bold">
                🦐 생태계
              </Typography>
              <ToggleButtonGroup color="primary" value={isEcoSystem} exclusive onChange={ecoChange} aria-label="Platform">
                {twoButtons.map((eco) => (
                  <ToggleButton key={eco.label} value={eco.value} size="small">
                    <Typography fontSize={14} fontWeight="bold" width={eco.width}>
                      {eco.label}
                    </Typography>
                  </ToggleButton>
                ))}
              </ToggleButtonGroup>
            </Stack>
            <Stack flexDirection="row" justifyContent="space-between" alignItems="center">
              <Typography fontSize={16} fontWeight="bold">
                😱 공포 탐욕지수
              </Typography>
              <ToggleButtonGroup color="primary" value={isFearGreed} exclusive onChange={onToggleFearGreed} aria-label="Platform">
                {twoButtons.map((eco) => (
                  <ToggleButton key={eco.label} value={eco.value} size="small">
                    <Typography fontSize={14} fontWeight="bold" width={eco.width}>
                      {eco.value ? '사진' : '텍스트'}
                    </Typography>
                  </ToggleButton>
                ))}
              </ToggleButtonGroup>
            </Stack>
          </Stack>
        </Container>
      </Dialog>
    </>
  )
}

export default memo(SettingDialog)
