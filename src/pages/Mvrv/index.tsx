// import { useState } from 'react'
import { Stack } from '@mui/material'
// import { LottieProps } from 'react-lottie-player'
// import { useBearStore } from '@/store'
// import { responsive } from '@/styles/style'
// import { getIsOverTimeCheck } from '@/utils/common'
// import { getMVRVImage, getStorageMvrvImage } from '@/api/mvrv'

// import Spinner from '@/components/atom/Spinner'
import PageTitle from '@/components/atom/PageTitle'
import MvrvExplain from '@/components/explain/MvrvExplain'
// import LottieItem from '@/components/atom/LottieItem'
// import Bitcoin404 from '@/assets/404-bitcoin.json'
// import { mvrvToast } from '@/utils/toast'

// const imgSize = { width: 1200, height: 700 }
// const defaultOption: LottieProps = { loop: true, play: true }
// const lottieOption = { ...defaultOption, style: { width: '100%', height: '150px' } }

// const limitTime = 60 * 60 * 1000 // 1시간 ms

const MvrvPage = () => {
  // const matches = useMediaQuery(`(min-width: ${responsive.mobile}px)`)
  // const mvrvData = useBearStore((state) => state.mvrvData)
  // const [isLoad, setLoad] = useState<boolean | null>(null) // true: 로드 완료, false: 로드 실패, null: 로딩 중
  // const [img, setImg] = useState<string | undefined>()
  // const [isWait, setWait] = useState(false)

  // 개발용 테스트 함수
  // const setMvrv = useBearStore((state) => state.setMvrv)
  // const resetCache = () => {
  //   setMvrv({ value: mvrvData.value, date: mvrvData.date, timeStamp: 1699150215985 })
  // }

  // 이미지 조회 API 호출
  // const getMvrv = async () => {
  //   try {
  //     console.log('🏃🏻‍♂️ MVRV 이미지 호출')
  //     setWait(true)
  //     // setMvrv({ value: '', date: '', timeStamp: mvrvData.timeStamp })
  //     await getMVRVImage()
  //   } catch (err) {
  //     setLoad(false)
  //   } finally {
  //     setWait(false)
  //   }
  // }
  // 로컬스토리지에 이미지 저장 시 이미지 주소 업데이트
  // const updateMvrvImage = () => {
  //   setImg(getStorageMvrvImage())
  // }
  // 이미지 로드 완료 처리
  // const onLoad = () => {
  //   console.log('🏞️ MVRV - 이미지 로드 성공')
  //   setLoad(true)
  // }
  // // 이미지 로드 오류시 404 표시
  // const onError = () => {
  //   if (img === '') return
  //   console.error('❌ 이미지 로드 실패')
  //   mvrvToast.error()
  //   setLoad(false)
  // }
  // 제한 시간안에 API 호출 여부 체크
  // const updateCheck = async () => {
  //   const isOver = getIsOverTimeCheck(mvrvData.timeStamp, new Date().getTime(), limitTime)
  //   if (isOver) {
  //     await getMvrv()
  //     console.log('✅ MVRV 데이터 업데이트!')
  //     mvrvToast.success()
  //   }
  // }

  // useLayoutEffect(() => {
  //   updateCheck()
  // }, [])

  // useEffect(() => {
  //   updateMvrvImage()
  // }, [mvrvData])

  return (
    <Stack flexDirection="column" width="100%" height="100%" justifyContent="flex-start">
      <PageTitle title="비트코인: MVRV Z-Score" />
      <MvrvExplain />
      {/* <br /> */}
      {/* {isLoad && (
        <Stack alignItems="center" justifyContent="flex-start" gap={1} mb={2}>
          <Stack flexDirection="row" alignItems="center" gap={1} sx={{ width: '100%' }}>
            <Typography variant="h3" fontSize={20} fontWeight="bold">
              MVRV Z-Score: <u>{mvrvData.value}</u>
            </Typography>
            {isWait && <Spinner size={20} />}
          </Stack>
          <Stack flexDirection="row" alignItems="center" gap={1} sx={{ width: '100%' }}>
            <Typography variant="h3" align="right" fontSize={16} py={1}>
              (Update: {mvrvData.date?.toString().replace(/-/g, '.')})
            </Typography>
            {isWait && <Spinner size={20} />}
          </Stack>
        </Stack>
      )} */}
      {/* {isWait && <LinearProgress sx={{ height: '6px', borderRadius: '3px' }} />}
      {isLoad === null && <Skeleton variant="rectangular" width="100%" height="100%" sx={{ maxWidth: `${imgSize.width}px`, bgcolor: 'gray.600', aspectRatio: '9 / 5', mb: 2 }} />}
      {isLoad === false && <LottieItem play option={lottieOption} animationData={Bitcoin404} speed={1} />}
      {isLoad !== false && (
        <img className={`mvrv-img ${isLoad && 'loaded'}`} src={img} width={imgSize.width} height={matches ? imgSize.height : 'auto'} alt="Bitcoin Mvrv Z-Score" onLoad={onLoad} onError={onError} />
      )}
      {isDev && <Button onClick={resetCache}>캐시 리셋</Button>} */}
    </Stack>
  )
}

export default MvrvPage
