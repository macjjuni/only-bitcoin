import { memo, useEffect, useCallback, useState } from 'react'
import { Stack, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, Typography, Divider } from '@mui/material'
import HalvingExpain from '@/components/molecule/HalvingExpain'
import HalvingTable from '@/components/molecule/HalvingTable'
import BtcIcon from '@/components/icon/BtcIcon'
import CopyNoneIconButton from '@/components/CopyNoneIconButton'
import { useBearStore } from '@/zustand/store'
import { btcHalvingData } from '@/data/btcInfo'
import { transTimeStampDate } from '@/utils/common'

interface IBlock {
  nextHalvingHeight: number | string
  nextHalvingPredictedDate: number | string
}

const BitcoinHalvingTable = () => {
  const { blockData } = useBearStore((state) => state)
  const [nextHalving, setNextHalving] = useState<IBlock>({
    nextHalvingHeight: 0, // 다음 반감기 블록 높이
    nextHalvingPredictedDate: '', // 다음 반감기 예측 날짜
  })

  const getNextHalvingData = useCallback(() => {
    const nextHalv = btcHalvingData.find((Halving) => Halving.blockNum > blockData.height)
    setNextHalving({ nextHalvingHeight: nextHalv?.blockNum || 0, nextHalvingPredictedDate: nextHalv?.date || '' })
  }, [])

  useEffect(() => {
    getNextHalvingData()
  }, [blockData])

  return (
    <Stack flexDirection="column" width="100%" height="100%" justifyContent="center">
      <Typography variant="h2" fontSize={24} fontWeight="bold" display="flex" justifyContent="flex-start" alignItems="center" gap="4px" mt="8px" mb="16px">
        <BtcIcon size={28} />
        비트코인 반감기
      </Typography>
      <Divider />
      <br />
      <HalvingExpain />
      <Typography variant="h3" fontSize={20} fontWeight="bold" display="flex" justifyContent="flex-start" alignItems="center" gap="4px" mt="24px" mb="16px">
        현재 블록 현황
      </Typography>

      <TableContainer component={Paper}>
        <Table sx={{ minWidth: 800 }} size="small" aria-label="a dense table">
          <TableHead>
            <TableRow>
              <TableCell>타임스탬프</TableCell>
              <TableCell align="right">현재 블록 높이</TableCell>
              <TableCell align="right">다음 반감기 블록 높이</TableCell>
              <TableCell align="right">다음 반감기 예상날짜</TableCell>
              <TableCell align="right">다음 반감기까지 남은 블록 수</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            <TableRow sx={{ '&:last-child td, &:last-child th': { border: 0 } }}>
              <TableCell component="th" scope="row">
                <CopyNoneIconButton txt={transTimeStampDate(blockData.timeStamp)} />
              </TableCell>
              <TableCell align="right">
                <CopyNoneIconButton txt={blockData.height} />
              </TableCell>
              <TableCell align="right">
                <CopyNoneIconButton txt={nextHalving.nextHalvingHeight} />
              </TableCell>
              <TableCell align="right">
                <CopyNoneIconButton txt={nextHalving.nextHalvingPredictedDate} />
              </TableCell>
              <TableCell align="right">
                <CopyNoneIconButton txt={Number(nextHalving.nextHalvingHeight) - Number(blockData.height)} />
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </TableContainer>
      <Typography variant="h3" fontSize={20} fontWeight="bold" display="flex" justifyContent="flex-start" alignItems="center" gap="4px" mt="24px" mb="16px">
        반감기 표
      </Typography>
      <HalvingTable />
    </Stack>
  )
}

export default memo(BitcoinHalvingTable)
