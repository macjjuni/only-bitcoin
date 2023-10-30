import { memo, useEffect, useCallback, useState } from 'react'
import { Stack, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, Typography, Divider } from '@mui/material'
import HalvingExpain from '@/components/molecule/HalvingExpain'
import HalvingTable from '@/components/molecule/HalvingTable'
import BtcIcon from '@/components/icon/BtcIcon'
import CopyNoneIconButton from '@/components/CopyNoneIconButton'
import { btcHalvingData } from '@/data/btcInfo'
import { getBtcRecentBlockHeight } from '@/api/mempool'

interface IBlock {
  height: number | string
  date: string
  nextHalvingHeight: number | string
  nextHalvingPredictedDate: number | string
}

const BitcoinHalvingTable = () => {
  const [block, setBlock] = useState<IBlock>({
    height: 0, // 최신 블록 높이
    date: '', // 최신 블록 날짜
    nextHalvingHeight: 0, // 다음 반감기 블록 높이
    nextHalvingPredictedDate: '', // 다음 반감기 예측 날짜
  })

  const getBlockHeight = useCallback(async () => {
    try {
      const { height, date } = await getBtcRecentBlockHeight()
      const nextHalving = btcHalvingData.find((Halving) => Halving.blockNum > height)
      setBlock({ height, date, nextHalvingHeight: nextHalving?.blockNum || 0, nextHalvingPredictedDate: nextHalving?.date || '' })
    } catch (err) {
      console.error(err)
      setBlock({ height: 'Network Error!', date: '-', nextHalvingHeight: '-', nextHalvingPredictedDate: '-' })
    }
  }, [])

  useEffect(() => {
    getBlockHeight()
  }, [])

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
                <CopyNoneIconButton txt={block.date} />
              </TableCell>
              <TableCell align="right">
                <CopyNoneIconButton txt={block.height} />
              </TableCell>
              <TableCell align="right">
                <CopyNoneIconButton txt={block.nextHalvingHeight} />
              </TableCell>
              <TableCell align="right">
                <CopyNoneIconButton txt={block.nextHalvingPredictedDate} />
              </TableCell>
              <TableCell align="right">
                <CopyNoneIconButton txt={Number(block.nextHalvingHeight) - Number(block.height)} />
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
