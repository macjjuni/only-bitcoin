import { type Dispatch, type SetStateAction, useCallback } from 'react'
import { RiCloseCircleLine } from 'react-icons/ri'
import { DialogTitle, Dialog, Container, Typography, IconButton, Stack } from '@mui/material'
import { useBearStore } from '@/store'
import { comma, calcPerDiff } from '@/utils/common'

type DialogType = {
  open: boolean
  setOpen: Dispatch<SetStateAction<boolean>>
}

const ExRateDialog = ({ open, setOpen }: DialogType) => {
  const btc = useBearStore((state) => state.btc)
  const { basePrice, date, provider } = useBearStore((state) => state.exRate)
  const closeDialog = useCallback(() => {
    setOpen(false)
  }, [])

  return (
    <Dialog onClose={closeDialog} open={open} className="mui-dialog">
      <DialogTitle minWidth={340} borderBottom="1px solid #a5a5a5" sx={{ padding: '12px 16px' }}>
        <Stack flexDirection="row" justifyContent="space-between" alignItems="center">
          <Typography component="p" fontSize={16} fontWeight="bold">
            한국 프리미엄 및 환율 정보
          </Typography>
          <IconButton onClick={closeDialog} sx={{ padding: '0' }}>
            <RiCloseCircleLine fontSize={24} />
          </IconButton>
        </Stack>
      </DialogTitle>
      <Container sx={{ padding: '16px' }}>
        <Stack flexDirection="row" justifyContent="space-between" alignItems="center">
          <Typography>한국 프리미엄</Typography>
          <Typography>{calcPerDiff(btc.krw, btc.usd, basePrice)}%</Typography>
        </Stack>
        <Stack flexDirection="row" justifyContent="space-between" alignItems="center">
          <Typography>환율(USD/KRW)</Typography>
          <Typography>{comma(basePrice.toString())}원</Typography>
        </Stack>
        <Stack flexDirection="row" justifyContent="space-between" alignItems="center">
          <Typography>제공</Typography>
          <Typography>{provider}</Typography>
        </Stack>
        <Stack flexDirection="row" justifyContent="space-between" alignItems="center">
          <Typography>환율등록일시</Typography>
          <Typography>{date}</Typography>
        </Stack>
      </Container>
    </Dialog>
  )
}

export default ExRateDialog
