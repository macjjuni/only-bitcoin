import { memo } from 'react'
import { Stack, FormControl, InputLabel, InputAdornment, OutlinedInput } from '@mui/material'
import CopyButton from '@/components/atom/CopyButton'
import SatIcon from '@/components/icon/SatIcon'

interface ISatoshi {
  sat: string
}

const SatoshiLabel = ({ sat }: ISatoshi) => {
  return (
    <Stack alignItems="flex-end">
      <FormControl fullWidth size="small">
        <InputLabel size="small" htmlFor="sat">
          Satoshi
        </InputLabel>
        <OutlinedInput
          id="sat"
          className="input-center fz16"
          readOnly
          sx={{ fontSize: 'inherit' }}
          value={sat}
          label="Satoshi"
          size="small"
          startAdornment={
            <InputAdornment position="start">
              <Stack justifyContent="center" alignItems="center" width="36px">
                <SatIcon width={24} height={24} />
              </Stack>
            </InputAdornment>
          }
          endAdornment={
            <InputAdornment position="start" sx={{ m: 0 }}>
              <CopyButton txt={sat} />
            </InputAdornment>
          }
        />
      </FormControl>
    </Stack>
  )
}

export default memo(SatoshiLabel)
