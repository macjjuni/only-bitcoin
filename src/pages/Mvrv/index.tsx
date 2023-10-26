import { type LottieProps } from 'react-lottie-player'
import { useState, useEffect, useRef, useCallback } from 'react'
import useMediaQuery from '@mui/material/useMediaQuery'
import { Typography, Skeleton, Stack, Box } from '@mui/material'
import BtcIcon from '@/components/icon/BtcIcon'
import { getMvrvImage } from '@/api/mvrv'
import LottieItem from '@/components/LottieItem'
import Bitcoin404 from '@/assets/404-bitcoin.json'
import { transDate } from '@/utils/common'

const imgSize = {
  width: 1030,
  height: 300,
}
const defaultOption: LottieProps = { loop: true, play: true }
const lottieOption = { ...defaultOption, style: { width: 'auto', height: '150px' } }

export interface IMvrvImg {
  status: null | boolean
  imgBase64: string
  size: string
  date: string
}

const MvrvPage = () => {
  const matches = useMediaQuery('(min-width:600px)')
  const imgRef = useRef<HTMLImageElement>(null)
  const [imgInfo, setImgInfo] = useState<IMvrvImg>({
    status: null,
    imgBase64: '/',
    size: '',
    date: '',
  })

  const getImg = useCallback(async () => {
    const { status, imgBase64, size, date } = await getMvrvImage()
    setImgInfo((prev) => {
      return { ...prev, status, imgBase64: `data:image/webp;base64, ${imgBase64}`, size, date: transDate(date) }
    })
  }, [])

  useEffect(() => {
    getImg()
  }, [])

  useEffect(() => {
    if (imgInfo.status) imgRef.current?.classList.add('loaded')
  }, [imgInfo])

  return (
    <Stack flexDirection="column" height="100%">
      <Box position="absolute" top="50%" left="50%" sx={{ transform: 'translate(-50%, -50%)' }}>
        {imgInfo.status === null && <Skeleton variant="rectangular" width={matches ? `${imgSize.width}px` : '300px'} height="100%" sx={{ bgcolor: '#000', aspectRatio: '9 / 5' }} />}
      </Box>
      {imgInfo.status && (
        <Typography variant="h2" fontSize={24} fontWeight="bold" display="flex" alignItems="center" justifyContent="flex-start" gap="8px" mb="16px">
          <Box display="flex" justifyContent="center" alignItems="center" gap="4px">
            <BtcIcon size={28} />
            Bitcoin: MVRV Z-Score
          </Box>
        </Typography>
      )}
      {imgInfo.status === false && <LottieItem play option={lottieOption} animationData={Bitcoin404} speed={1} />}
      <img ref={imgRef} className="mvrv-img" src={imgInfo.imgBase64} width={imgSize.width} height={imgSize.height} alt="Bitcoin Mvrv Z-Score" />
      {imgInfo.status && (
        <Typography align="right" fontSize={16} mt="8px">
          Update: {imgInfo.date}
        </Typography>
      )}
    </Stack>
  )
}

export default MvrvPage
