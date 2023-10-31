import { memo } from 'react'
import { Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper } from '@mui/material'
import CopyNoneIconButton from '@/components/CopyNoneIconButton'
import { btcHalvingData } from '@/data/btcInfo'
import { comma } from '@/utils/common'

const HalvingTable = () => {
  return (
    <TableContainer component={Paper}>
      <Table sx={{ minWidth: 580 }} size="small" aria-label="a dense table">
        <TableHead>
          <TableRow>
            <TableCell>날짜</TableCell>
            <TableCell align="right">반감기</TableCell>
            <TableCell align="right">블록 높이</TableCell>
            <TableCell align="right">현재 블록 보상 (BTC)</TableCell>
            <TableCell align="right">현재 블록 보상 (Sats)</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {btcHalvingData.map((row, idx) => (
            <TableRow key={row.date} sx={{ '&:last-child td, &:last-child th': { border: 0 } }}>
              <TableCell component="th" scope="row">
                <CopyNoneIconButton txt={row.date} />
              </TableCell>
              <TableCell align="right">
                <CopyNoneIconButton txt={idx} />
              </TableCell>
              <TableCell align="right">
                <CopyNoneIconButton txt={row.blockNum} />
              </TableCell>
              <TableCell align="right">
                <CopyNoneIconButton txt={row.currentReward.toFixed(9)} />
              </TableCell>
              <TableCell align="right">
                <CopyNoneIconButton txt={comma((row.currentReward * 100000000).toFixed(0))} />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  )
}

export default memo(HalvingTable)
