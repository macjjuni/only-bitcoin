import { memo } from 'react'
import { Stack, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, Typography, Divider } from '@mui/material'
import BtcIcon from '@/components/icon/BtcIcon'
import CopyNoneIconButton from '@/components/CopyNoneIconButton'
import { comma } from '@/utils/common'

const createData = (date: number | string, blockNumber: number, currentReward: number) => {
  return { date, blockNumber: comma(blockNumber.toString()), currentReward }
}
const transSats = (btc: number) => (btc * 100000000).toFixed(0) // 사토시 계산

const BitcoinHalvingTable = () => {
  const rows = [
    createData('2009.01.03', 0, 50.0),
    createData('2012.11.28', 210000, 25.0),
    createData('2016.07.09', 420000, 12.5),
    createData('2020.05.11', 630000, 6.25),
    createData('2024.04.xx', 840000, 3.125),
    createData(2028, 1050000, 1.5625),
    createData(2032, 1260000, 0.78125),
    createData(2036, 1470000, 0.390625),
    createData(2040, 1680000, 0.1953125),
    createData(2044, 1890000, 0.09765625),
    createData(2048, 2100000, 0.048828125),
    createData(2052, 2310000, 0.0244140625),
    createData(2056, 2520000, 0.01220703125),
    createData(2060, 2730000, 0.006103515625),
    createData(2064, 2940000, 0.0030517578125),
    createData(2068, 3150000, 0.00152587890625),
    createData(2072, 3360000, 0.000762939453125),
    createData(2076, 3570000, 0.0003814697265625),
    createData(2080, 3780000, 0.00019073486328125),
    createData(2084, 3990000, 0.000095367431640625),
    createData(2088, 4200000, 0.0000476837158203125),
    createData(2092, 4410000, 0.00002384185791015625),
    createData(2096, 4620000, 0.000011920928955078125),
    createData(2100, 4830000, 0.0000059604644775390625),
    createData(2104, 5040000, 0.00000298023223876953125),
    createData(2108, 5250000, 0.000001490116119384765625),
    createData(2112, 5460000, 0.0000007450580596923828125),
    createData(2116, 5670000, 0.00000037252902984619140625),
    createData(2120, 5880000, 0.000000186264514923095703125),
    createData(2124, 6090000, 0.0000000931322574615478515625),
    createData(2128, 6300000, 0.00000004656612873077392578125),
    createData(2132, 6510000, 0.000000023283064365386962890625),
    createData(2136, 6720000, 0.0000000116415321826934814453125),
    createData(2140, 6930000, 0.00000000582076609134674072265625),
    // 나머지 데이터를 추가합니다.
  ]

  return (
    <Stack flexDirection="column" width="100%" height="100%" justifyContent="center">
      <Typography variant="h2" fontSize={24} fontWeight="bold" display="flex" justifyContent="flex-start" alignItems="center" gap="4px" mt="8px" mb="16px">
        <BtcIcon size={28} />
        비트코인 반감기 표
      </Typography>

      <Divider />

      <Typography fontSize={16} my="16px">
        비트코인 네트워크에서는 4년마다 “반감기”라는 이벤트가 발생합니다. 이것은 대략 10분마다 새로운 블록 생성자 즉, 채굴자에게 주어지는 공급이 절반으로 줄어든다는 의미입니다. 반감기는 210,000
        블록마다 주기적으로 발생하며 현재 4번 쨰 반감기를 향해 달려가고 있습니다.{' '}
        <a rel="noreferrer" target="_blank" href="https://mempool.space/ko/">
          (<u>현재 블록 확인</u>)
        </a>
      </Typography>

      <TableContainer component={Paper} sx={{ marginTop: '16px' }}>
        <Table sx={{ minWidth: 650 }} size="small" aria-label="a dense table">
          <TableHead>
            <TableRow>
              <TableCell>날짜</TableCell>
              <TableCell align="right">반감기</TableCell>
              <TableCell align="right">블록 번호</TableCell>
              <TableCell align="right">현재 블록 보상 (BTC)</TableCell>
              <TableCell align="right">현재 블록 보상 (Sats)</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.map((row, idx) => (
              <TableRow key={row.date} sx={{ '&:last-child td, &:last-child th': { border: 0 } }}>
                <TableCell component="th" scope="row">
                  <CopyNoneIconButton txt={row.date} />
                </TableCell>
                <TableCell align="right">
                  <CopyNoneIconButton txt={idx} />
                </TableCell>
                <TableCell align="right">
                  <CopyNoneIconButton txt={row.blockNumber} />
                </TableCell>
                <TableCell align="right">
                  <CopyNoneIconButton txt={row.currentReward.toFixed(9)} />
                </TableCell>
                <TableCell align="right">
                  <CopyNoneIconButton txt={comma(transSats(row.currentReward))} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Stack>
  )
}

export default memo(BitcoinHalvingTable)
