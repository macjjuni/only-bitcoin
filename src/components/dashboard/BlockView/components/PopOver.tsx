import { memo, useState, useEffect } from 'react'
import moment from 'moment'
import { Popover, Stack, Typography, useMediaQuery } from '@mui/material'
import { responsive } from '@/styles/style'
import Progress from '@/components/molecule/Progress'
import { useBearStore } from '@/zustand/store'
import { transTimeStampDate } from '@/utils/common'

interface IPopOver {
  anchorEl: HTMLElement | null
  open: boolean
  handlePopoverClose: (e: React.MouseEvent<HTMLElement>) => void
}

const diffTimeStamp = (time1: number, time2 = new Date().getTime()) => {
  return moment
    .duration(moment(time2).diff(moment.unix(time1)))
    .asMinutes()
    .toFixed(0)
}

const PopOver = ({ anchorEl, open, handlePopoverClose }: IPopOver) => {
  const matches = useMediaQuery(`(min-width: ${responsive.mobile}px)`)
  const blockData = useBearStore((state) => state.blockData)
  const [diff, setDiff] = useState(diffTimeStamp(blockData.timeStamp))

  useEffect(() => {
    setDiff(diffTimeStamp(blockData.timeStamp))
  }, [blockData])

  return (
    <Popover
      sx={{ pointerEvents: 'none' }}
      open={open}
      anchorEl={anchorEl}
      anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
      transformOrigin={{ vertical: 'top', horizontal: 'center' }}
      onClose={handlePopoverClose}
      disableRestoreFocus
    >
      <Stack px="8px" pt="4px" pb="8px" gap="6px">
        <Typography fontSize={matches ? 16 : 14}>
          블록 생성 시간: {transTimeStampDate(blockData.timeStamp).replace(/-/g, '.')}({diff}분 전)
        </Typography>
        <Progress value={80} />
      </Stack>
    </Popover>
  )
}

export default memo(PopOver)
