import { useState, useLayoutEffect, useEffect } from 'react'
import { Typography, Stack, Skeleton, useMediaQuery, Divider } from '@mui/material'
import { LottieProps } from 'react-lottie-player'
import { useBearStore } from '@/store'
import { responsive } from '@/styles/style'
import { getIsOverTimeCheck } from '@/utils/common'
import { getMVRVImage, getStorageMvrvImage } from '@/api/mvrv'
import BtcIcon from '@/components/icon/BtcIcon'
import MvrvExplain from '@/components/explain/MvrvExplain'
import LottieItem from '@/components/atom/LottieItem'
import Bitcoin404 from '@/assets/404-bitcoin.json'

const imgSize = { width: 1200, height: 700 }
const defaultOption: LottieProps = { loop: true, play: true }
const lottieOption = { ...defaultOption, style: { width: '100%', height: '150px' } }

const limitTime = 60 * 60 * 1000 // 1시간 ms

const MvrvPage = () => {
  const mvrvData = useBearStore((state) => state.mvrvData)
  const matches = useMediaQuery(`(min-width: ${responsive.mobile}px)`)
  const [isLoad, setLoad] = useState<boolean | null>(null) // true: 로드 완료, false: 로드 실패, null: 로딩 중
  const [img, setImg] = useState<string | undefined>()

  // 이미지 조회 API 호출
  const getMvrv = async () => {
    try {
      await getMVRVImage()
    } catch (err) {
      setLoad(false)
    }
  }

  // 로컬스토리지에 이미지 저장 시 이미지 주소 업데이트
  const updateMvrvImage = () => {
    setImg(getStorageMvrvImage())
  }
  // 이미지 로드 완료 처리
  const onLoad = () => {
    console.log('🏞️ MVRV - 이미지 로드 성공')
    setLoad(true)
  }
  // 이미지 로드 오류시 404 표시
  const onError = () => {
    if (img === '') return
    console.error('❌ 이미지 로드 실패')
    setLoad(false)
  }
  // 제한 시간안에 API 호출 여부 체크
  const updateCheck = async () => {
    const isOver = getIsOverTimeCheck(mvrvData.timeStamp, new Date().getTime(), limitTime)
    if (isOver) {
      getMvrv()
      console.log('🏃🏻‍♂️ MVRV 이미지 조회')
    }
  }

  useLayoutEffect(() => {
    updateCheck()
  }, [])

  useEffect(() => {
    updateMvrvImage()
  }, [mvrvData])

  return (
    <Stack flexDirection="column" width="100%" height="100%" justifyContent="flex-start">
      <Typography variant="h2" fontSize={24} fontWeight="bold" display="flex" justifyContent="flex-start" alignItems="center" gap="4px" mt="8px" mb="16px">
        <BtcIcon size={28} />
        비트코인: MVRV Z-Score
      </Typography>
      <Divider />
      <br />
      <MvrvExplain />

      {isLoad && (
        <Typography variant="h2" fontSize={20} fontWeight="bold" display="flex" alignItems="center" justifyContent="flex-start" gap="8px" mt="24px" mb="16px">
          <Typography fontSize={18} fontWeight="bold">
            MVRV Z-Score: <u>{mvrvData.value}</u>
          </Typography>
          <Typography align="right" fontSize={16} py="4px">
            (Update: {mvrvData.date?.toString().replace(/-/g, '.')})
          </Typography>
        </Typography>
      )}
      {isLoad === null && <Skeleton variant="rectangular" width="100%" height="100%" sx={{ maxWidth: `${imgSize.width}px`, bgcolor: 'gray.600', aspectRatio: '9 / 5', margin: '16px 0' }} />}
      {isLoad === false && <LottieItem play option={lottieOption} animationData={Bitcoin404} speed={1} />}
      {isLoad !== false && (
        <img className={`mvrv-img ${isLoad && 'loaded'}`} src={img} width={imgSize.width} height={matches ? imgSize.height : 'auto'} alt="Bitcoin Mvrv Z-Score" onLoad={onLoad} onError={onError} />
      )}
    </Stack>
  )
}

export default MvrvPage
