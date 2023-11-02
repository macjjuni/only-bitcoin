import { memo } from 'react'
import { Stack } from '@mui/material'
import CopyButton from '@/components/atom/CopyButton'
import SatIcon from '@/components/icon/SatIcon'

interface ISatoshi {
  sat: string
}

const SatoshiLabel = ({ sat }: ISatoshi) => {
  return (
    <Stack alignItems="flex-end">
      <Stack flexDirection="row" alignItems="center">
        <CopyButton txt={sat} />
        {sat}
        <span className="unit-txt">Sat</span>
        <Stack flexDirection="row" alignItems="center">
          &#40;
          <SatIcon width={20} height={20} />
          &#41;
        </Stack>
      </Stack>
    </Stack>
  )
}

export default memo(SatoshiLabel)
