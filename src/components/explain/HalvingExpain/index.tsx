import { memo } from 'react'
import { useMediaQuery, Typography } from '@mui/material'
import ExplainFrame from '../../molecule/ExplainFrame'
import { responsive } from '@/styles/style'
import { comma } from '@/utils/common'

const HalvingExplain = ({ nextHeight }: { nextHeight: number }) => {
  const matches = useMediaQuery(`(min-width: ${responsive.mobile}px)`)
  return (
    <ExplainFrame
      title="📚 반감기(Halving)란?"
      content={
        <Typography fontSize={matches ? 16 : 14}>
          비트코인 네트워크에서는 4년마다 “반감기”라는 이벤트가 발생합니다. 이것은 대략 10분마다 새로운 블록 생성자 즉, 채굴자에게 주어지는 보상이 절반으로 줄어든다는 의미입니다. 반감기는 210,000
          블록마다 주기적으로 발생하며 다음 반감기는 {comma(nextHeight.toString())} 블록 높이에 {(nextHeight / 210000).toFixed(0)}번 째 반감기가 예정되어 있습니다.
          <br />
          <a rel="noreferrer" target="_blank" href="https://mempool.space/ko/">
            (<u>멤풀에서 블록 구경하기</u>)
          </a>
        </Typography>
      }
    />
  )
}

export default memo(HalvingExplain)
