import { Dispatch, SetStateAction } from 'react'
import { Link, DialogTitle, Dialog, Container, Typography } from '@mui/material'

type DialogType = {
  open: boolean
  setOpen: Dispatch<SetStateAction<boolean>>
}

const CopyDialog = ({ open, setOpen }: DialogType) => {
  const closeDialog = () => {
    setOpen(false)
  }
  return (
    <>
      <Dialog onClose={closeDialog} open={open}>
        <DialogTitle sx={{ minWidth: '420px', borderBottom: '1px solid #a5a5a5' }}>리소스 출처</DialogTitle>
        <Container sx={{ padding: '24px' }}>
          <Typography component="p">
            시세정보 :{' '}
            <Link href="https://docs.upbit.com/docs/upbit-quotation-websocket" target="_blank" title="Upbit 공식문서">
              업비트 Docs
            </Link>
          </Typography>
          <Typography component="p">
            애니메이션 :{' '}
            <Link href="https://lottiefiles.com/" target="_blank" title="LottieFiles">
              LottieFiles
            </Link>
          </Typography>
          <Typography component="p">
            아이콘 :{' '}
            <Link href="https://react-icons.github.io/react-icons/" target="_blank" title="react-icon">
              React-Icon
            </Link>
          </Typography>
          <Typography component="p">
            파비콘 :{' '}
            <Link href="https://www.flaticon.com/free-icons/bitcoin" target="_blank" title="bitcoin icons">
              Bitcoin icons created by Freepik - Flaticon
            </Link>
          </Typography>
        </Container>
      </Dialog>
    </>
  )
}

export default CopyDialog
