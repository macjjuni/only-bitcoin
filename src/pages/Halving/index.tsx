import { Stack, Typography, useMediaQuery } from '@mui/material'
import HalvingExpain from '@/components/explain/HalvingExpain'
import HalvingTable from '@/components/molecule/HalvingTable'
import CubeLottie from '@/components/dashboard/BlockView/components/CubeLottie'
import CardItem from '@/components/molecule/CardItem'
import Progress from '@/components/molecule/Progress'
import PageTitle from '@/components/atom/PageTitle'
import PageSubTitle from '@/components/atom/PageSubTitle'

import { useBearStore } from '@/store'
import { calcRemainingTime, transTimeStampDate, comma } from '@/utils/common'
import { responsive } from '@/styles/style'

const BitcoinHalvingPage = () => {
  const matches = useMediaQuery(`(min-width: ${responsive.mobile}px)`)
  const blockData = useBearStore((state) => state.blockData)

  return (
    <Stack flexDirection="column" width="100%" height="100%" justifyContent="center">
      {/* 페이지 타이틀 */}
      <PageTitle title="비트코인 반감기" />
      {/* 반감기 설명 컴포넌트 */}
      <HalvingExpain />
      {/* 페이지 서브 타이틀 */}
      <PageSubTitle subTitle="실시간 블록 현황" />
      {/* 실시간 블록 현황 */}
      <Stack direction={matches ? 'row' : 'column'} spacing={1.5} sx={{ overflowX: 'auto' }}>
        <CardItem
          title="다음 반감기 블록 높이"
          matches={matches}
          content={
            <>
              <CubeLottie />
              <Typography variant="h5" fontWeight="bold">
                {comma(blockData.nextHalving.nextHalvingHeight?.toString())}
              </Typography>
            </>
          }
          bottom={
            <>
              <Typography fontSize={14} fontWeight="bold" mb={1}>
                예상시간
              </Typography>
              <div>
                {calcRemainingTime(blockData.nextHalving.remainingHeight)}({blockData.nextHalving.nextHalvingPredictedDate})
              </div>
            </>
          }
        />
        <CardItem
          title="현재 블록 높이"
          matches={matches}
          content={
            <>
              <CubeLottie />
              <Typography variant="h5" fontWeight="bold">
                {comma(blockData.height?.toString())}
              </Typography>
            </>
          }
          bottom={
            <>
              <Typography fontSize={14} fontWeight="bold" mb={1}>
                타임스탬프
              </Typography>
              <div>{transTimeStampDate(blockData.timeStamp).replace(/-/g, '.')}</div>
            </>
          }
        />
        <CardItem
          title="다음 반감기까지 남은 블록"
          matches={matches}
          content={
            <>
              <CubeLottie />
              <Typography variant="h5" fontWeight="bold" gutterBottom>
                {comma(blockData.nextHalving.remainingHeight?.toString())}
              </Typography>
            </>
          }
          bottom={
            <>
              <Typography fontSize={14} fontWeight="bold" mb={1}>
                진행률
              </Typography>
              {/* 다음 반감기까지 진행률 프로그레스바 */}
              <Progress />
            </>
          }
        />
      </Stack>
      <PageSubTitle subTitle="반감기 표" />
      {/* 반감기 표 컴포넌트 */}
      <HalvingTable />
    </Stack>
  )
}

export default BitcoinHalvingPage
