import { Stack, Typography, Divider } from '@mui/material'
import HalvingExpain from '@/components/explain/HalvingExpain'
import HalvingTable from '@/components/molecule/HalvingTable'
import BtcIcon from '@/components/icon/BtcIcon'
import CubeLottie from '@/components/dashboard/BlockView/components/CubeLottie'
import CardItem from '@/components/molecule/CardItem'
import Progress from '@/components/molecule/Progress'

import { useBearStore } from '@/store'
import { calcRemainingTime, transTimeStampDate, comma } from '@/utils/common'

const BitcoinHalvingPage = () => {
  const blockData = useBearStore((state) => state.blockData)

  return (
    <Stack flexDirection="column" width="100%" height="100%" justifyContent="center">
      <Typography variant="h2" fontSize={24} fontWeight="bold" display="flex" justifyContent="flex-start" alignItems="center" gap="4px" mt="8px" mb="16px">
        <BtcIcon size={28} />
        비트코인 반감기
      </Typography>
      <Divider />
      <br />
      {/* 반감기 설명 컴포넌트 */}
      <HalvingExpain />

      <Typography variant="h3" fontSize={20} fontWeight="bold" display="flex" justifyContent="flex-start" alignItems="center" gap="4px" mt="24px" mb="16px">
        실시간 블록 현황
      </Typography>

      <Stack direction="row" spacing={2} sx={{ pb: '16px', overflowX: 'auto' }}>
        <CardItem
          title="다음 반감기 블록 높이"
          content={
            <>
              <CubeLottie />
              <Typography variant="h5" fontWeight="bold" gutterBottom>
                {comma(blockData.nextHalving.nextHalvingHeight?.toString())}
              </Typography>
            </>
          }
          bottom={
            <>
              <Typography fontSize={14} fontWeight="bold" mb="4px">
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
          content={
            <>
              <CubeLottie />
              <Typography variant="h5" fontWeight="bold" gutterBottom>
                {comma(blockData.height?.toString())}
              </Typography>
            </>
          }
          bottom={
            <>
              <Typography fontSize={14} fontWeight="bold" mb="4px">
                타임스탬프
              </Typography>
              <div>{transTimeStampDate(blockData.timeStamp).replace(/-/g, '.')}</div>
            </>
          }
        />

        <CardItem
          title="다음 반감기까지 남은 블록"
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
              <Typography fontSize={14} fontWeight="bold" mb="4px">
                진행률
              </Typography>
              {/* 다음 반감기까지 진행률 프로그레스바 */}
              <Progress />
            </>
          }
        />
      </Stack>

      <Typography variant="h3" fontSize={20} fontWeight="bold" display="flex" justifyContent="flex-start" alignItems="center" gap="4px" mt="16px" mb="16px">
        반감기 표
      </Typography>
      <HalvingTable />
    </Stack>
  )
}

export default BitcoinHalvingPage
