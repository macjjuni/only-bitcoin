import { Dispatch, SetStateAction } from 'react'
import { Link, DialogTitle, Dialog, Container, Typography, Stack, IconButton } from '@mui/material'
import { RiCloseCircleLine } from 'react-icons/ri'
import { SiNaver } from 'react-icons/si'
import { btcInfo } from '@/data/btcInfo'

type DialogType = {
  open: boolean
  setOpen: Dispatch<SetStateAction<boolean>>
}

const feedbackUrl = import.meta.env.VITE_FEEDBACK_URL

const CopyDialog = ({ open, setOpen }: DialogType) => {
  const closeDialog = () => {
    setOpen(false)
  }
  return (
    <>
      <Dialog onClose={closeDialog} open={open} className="mui-dialog">
        <DialogTitle minWidth={340} borderBottom="1px solid #a5a5a5" sx={{ padding: '12px 16px' }}>
          <Stack flexDirection="row" justifyContent="space-between" alignItems="center">
            <Typography component="p" fontSize={16} fontWeight="bold">
              ₿itcoin Market Price
            </Typography>
            <IconButton onClick={closeDialog} sx={{ padding: '0' }}>
              <RiCloseCircleLine fontSize={24} />
            </IconButton>
          </Stack>
        </DialogTitle>
        <Container sx={{ padding: '16px' }}>
          <Stack component="h2" justifyContent="flex-start" flexDirection="row" alignItems="center" fontWeight="bold" gap="8px" m="0" py="6px">
            {btcInfo.icon(24)}
            <Typography component="p" fontSize={18} fontWeight="bold">
              비트코인 디플로마 [
              <Link href="https://t.co/lS2dUOKcK0" target="_blank" title="비트코인 디플로마 한글 번역본 by ATOMIC BITCOIN">
                💾 다운로드
              </Link>
              ]
            </Typography>
          </Stack>

          <Stack component="h2" justifyContent="flex-start" flexDirection="row" alignItems="center" fontWeight="bold" gap="8px" m="0" py="6px" pb="24px">
            {btcInfo.icon(24)}
            <Typography component="p" fontSize={18} fontWeight="bold">
              비트코인 결제매장 [
              <Link href="https://map.naver.com/v5/favorite/myPlace/folder/05ad290200484bed8ae4ffd19e6cd213?c=7,0,0,0,dh" target="_blank" title="비트코인 결제매장(네이버지도)">
                <SiNaver color="#2DB400" fontSize={14} /> 네이버 지도
              </Link>
              ]
            </Typography>
          </Stack>

          <Typography component="p" fontSize={14}>
            시세 정보:{' '}
            <Link href="https://docs.upbit.com/docs/upbit-quotation-websocket" target="_blank" title="Upbit API Docs">
              Upbit
            </Link>{' '}
            /{' '}
            <Link href="https://binance-docs.github.io/apidocs/spot/en/#introduction" target="_blank" title="Binance API Docs">
              Binance
            </Link>
          </Typography>
          <Typography component="p" fontSize={14}>
            피드백:{' '}
            <Link href={feedbackUrl || '/'} target="_blank" title="Twitter url">
              Twitter
            </Link>
          </Typography>
          <Typography component="p" fontSize={14}>
            깃허브:{' '}
            <Link title="GitHub Repository" href="https://github.com/macjjuni/btc-price" target="_blank">
              Only Bitcoin Market Price
            </Link>
          </Typography>
        </Container>
      </Dialog>
    </>
  )
}

export default CopyDialog
