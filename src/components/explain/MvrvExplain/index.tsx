import { memo } from 'react'
import { useMediaQuery, Typography } from '@mui/material'
import ExplainFrame from '../../molecule/ExplainFrame'
import { responsive } from '@/styles/style'

const MvrvExplain = () => {
  const matches = useMediaQuery(`(min-width: ${responsive.mobile}px)`)
  return (
    <ExplainFrame
      title="MVRV(Market Value - Realized Value)란?"
      content={
        <>
          <Typography fontSize={matches ? 16 : 14}>
            MVRV(Market Value - Realized Value) 비율은 실현 시가총액과 시가총액을 비교하며 현재 시가총액 즉 시장 가격이 고평가/저평가의 영역에 있는지 시장 가격의 고점 혹은 저점을 예측하는데 도움을
            줍니다.
          </Typography>
          <br />
          <Typography mb="16px" fontSize={matches ? 16 : 14}>
            MVRV Z = (시가총액 - 실현 시가총액) /시가총액 표준편차 {!matches && <br />}
            <a target="_blank" rel="noreferrer" href="https://dataguide.cryptoquant.com/v/korean/market-data-indicators/mvrv-ratio">
              <u>(자세히)</u>
            </a>
          </Typography>
        </>
      }
    />
  )
}

export default memo(MvrvExplain)
