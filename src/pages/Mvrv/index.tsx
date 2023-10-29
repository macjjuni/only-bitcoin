import { useState, useRef, useCallback, useLayoutEffect } from 'react'
import { Typography, Stack, Skeleton, useMediaQuery, Divider, Box } from '@mui/material'
import { LottieProps } from 'react-lottie-player'
import { getMVRVImage, type IMvrv } from '@/api/mvrv'
import BtcIcon from '@/components/icon/BtcIcon'
import LottieItem from '@/components/LottieItem'
import Bitcoin404 from '@/assets/404-bitcoin.json'

const imgSize = {
  width: 1270,
  height: 700,
}
const defaultOption: LottieProps = { loop: true, play: true }
const lottieOption = { ...defaultOption, style: { width: '100%', height: '150px' } }

const MvrvPage = () => {
  const matches = useMediaQuery('(min-width:600px)')
  const [isLoad, setLoad] = useState<boolean | null>(null)
  const imgRef = useRef<HTMLImageElement>(null)
  const [img, setImg] = useState<IMvrv>({
    src: '/',
    mvrv: { val: '', date: '' },
  })

  const onLoad = useCallback(() => {}, [])

  const getMvrv = useCallback(async () => {
    try {
      const { src, mvrv } = await getMVRVImage()
      if (src === 'error') throw Error('src is error string')
      setImg({ src: `data:image/webp;base64, ${src}`, mvrv })
      setLoad(true)
      imgRef.current?.classList.add('loaded')
    } catch (err) {
      console.error(err)
      setLoad(false)
    }
  }, [])

  useLayoutEffect(() => {
    getMvrv()
  }, [])

  return (
    <Stack flexDirection="column" width="100%" height="100%" justifyContent="center">
      <Typography variant="h2" fontSize={24} fontWeight="bold" display="flex" justifyContent="flex-start" alignItems="center" gap="4px" mt="8px" mb="16px">
        <BtcIcon size={28} />
        Bitcoin: MVRV Z-Score
      </Typography>

      <Divider />

      <Typography my="16px" fontSize={matches ? 16 : 14}>
        MVRV 비율은 실현 시가총액과 시가총액을 비교하며 현재 시가총액 즉 시장 가격이 고평가/저평가의 영역에 있는지 시장 가격의 고점 혹은 저점을 예측하는데 도움을 줍니다. <br />
      </Typography>
      <Typography my="16px" fontSize={matches ? 14 : 12}>
        MVRV Z = (시가총액 - 실현 시가총액) /시가총액 표준편차
      </Typography>

      {isLoad === true && (
        <Typography variant="h2" fontSize={20} fontWeight="bold" display="flex" alignItems="center" justifyContent="flex-start" gap="8px" my="16px">
          <Box>
            MVRV Z-Score: <u>{img.mvrv.val}</u>
          </Box>
          <Box>
            {isLoad === true && (
              <Typography align="right" fontSize={16} py="4px">
                (Update: {img.mvrv.date?.toString().replace(/-/g, '.')})
              </Typography>
            )}
          </Box>
        </Typography>
      )}

      {isLoad === null && <Skeleton variant="rectangular" width={matches ? `${imgSize.width}px` : '360px'} height="100%" sx={{ bgcolor: '#000', aspectRatio: '9 / 5' }} />}
      {isLoad === false && <LottieItem play option={lottieOption} animationData={Bitcoin404} speed={1} />}
      {isLoad !== false && <img ref={imgRef} className="mvrv-img" src={img.src} onLoad={onLoad} width={imgSize.width} height={matches ? imgSize.height : 'auto'} alt="Bitcoin Mvrv Z-Score" />}
    </Stack>
  )
}

export default MvrvPage
