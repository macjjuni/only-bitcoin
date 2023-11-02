import { ChangeEvent } from 'react'
import { Stack, FormControl, InputLabel, OutlinedInput, InputAdornment } from '@mui/material'
import CopyButton from '@/components/atom/CopyButton'
import KrwIcon from '@/components/icon/KrwIcon'

interface IKrwInput {
  value: string
  readOnly: boolean
  onChange: (e: ChangeEvent<HTMLInputElement>) => void
}

// 자주 렌더링 됌
const KrwInput = ({ value, readOnly, onChange }: IKrwInput) => {
  return (
    <FormControl fullWidth>
      <InputLabel htmlFor="outlined-adornment-amount">KRW</InputLabel>
      <OutlinedInput
        label="Amount"
        className="price-input"
        readOnly={readOnly}
        value={value}
        onChange={onChange}
        startAdornment={
          <InputAdornment position="start">
            <Stack justifyContent="center" alignItems="center" width="36px">
              <KrwIcon size={20} />
            </Stack>
          </InputAdornment>
        }
        endAdornment={<CopyButton txt={value} />}
      />
    </FormControl>
  )
}

export default KrwInput
