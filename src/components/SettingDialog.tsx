import { memo, type Dispatch, type SetStateAction, type MouseEvent } from 'react'
import { RiCloseCircleLine } from 'react-icons/ri'
import { DialogTitle, Dialog, Container, Typography, ToggleButtonGroup, ToggleButton, IconButton, Stack } from '@mui/material'
import { useBearStore, type MarketType } from '@/zustand/store'

type DialogType = {
  open: boolean
  setOpen: Dispatch<SetStateAction<boolean>>
}

const unitList = [
  { id: 0, value: 'KRW', width: '48px' },
  { id: 1, value: 'USD', width: '48px' },
  { id: 2, value: 'KRW/USD', width: '72px' },
]

const SettingDialog = ({ open, setOpen }: DialogType) => {
  const { market, setMarket } = useBearStore((state) => state)

  const closeDialog = () => {
    setOpen(false)
  }

  const handleChange = (e: MouseEvent<HTMLElement>, selectMarket: MarketType) => {
    setMarket(selectMarket)
  }

  return (
    <>
      <Dialog onClose={closeDialog} open={open} className="mui-dialog">
        <DialogTitle minWidth={420} borderBottom="1px solid #a5a5a5" sx={{ padding: '12px 16px' }}>
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
          <Stack flexDirection="row" justifyContent="space-between" alignItems="center">
            <Typography fontSize={16} fontWeight="bold">
              💵 단위:
            </Typography>
            <ToggleButtonGroup color="primary" value={market} exclusive onChange={handleChange} aria-label="Platform">
              {unitList.map((unit) => (
                <ToggleButton key={unit.id} value={unit.value} size="small">
                  <Typography fontSize={14} fontWeight="bold" width={unit.width}>
                    {unit.value}
                  </Typography>
                </ToggleButton>
              ))}
            </ToggleButtonGroup>
          </Stack>
        </Container>
      </Dialog>
    </>
  )
}

export default memo(SettingDialog)
