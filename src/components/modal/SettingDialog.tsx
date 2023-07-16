import { memo, type Dispatch, type SetStateAction, type MouseEvent, useCallback } from 'react'
import { RiCloseCircleLine } from 'react-icons/ri'
import { DialogTitle, Dialog, Container, Typography, ToggleButtonGroup, ToggleButton, IconButton, Stack } from '@mui/material'
import { useBearStore, type MarketType } from '@/zustand/store'

type DialogType = {
  open: boolean
  setOpen: Dispatch<SetStateAction<boolean>>
}

const threeList = [
  { value: 'KRW', width: '44px' },
  { value: 'USD', width: '44px' },
  { value: 'KRW/USD', width: '68px' },
]

const twoList = [
  { label: '보이기', value: true, width: '86px' },
  { label: '숨기기', value: false, width: '86px' },
]

const SettingDialog = ({ open, setOpen }: DialogType) => {
  const { market, setMarket, isEcoSystem, toggleEco, isKimchi, toggleKimchi } = useBearStore((state) => state)

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

  return (
    <>
      <Dialog onClose={closeDialog} open={open} className="mui-dialog">
        <DialogTitle minWidth={340} borderBottom="1px solid #a5a5a5" sx={{ padding: '12px 16px' }}>
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
                💵 단위
              </Typography>
              <ToggleButtonGroup color="primary" value={market} exclusive onChange={marketChange} aria-label="Platform">
                {threeList.map((unit) => (
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
                🇰🇷 김프
              </Typography>
              <ToggleButtonGroup color="primary" value={isKimchi} exclusive onChange={kimchiChange} aria-label="Platform">
                {twoList.map((unit) => (
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
                {twoList.map((eco) => (
                  <ToggleButton key={eco.label} value={eco.value} size="small">
                    <Typography fontSize={14} fontWeight="bold" width={eco.width}>
                      {eco.label}
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
