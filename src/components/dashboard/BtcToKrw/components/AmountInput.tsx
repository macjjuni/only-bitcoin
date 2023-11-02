import { memo, ChangeEvent } from 'react'
import { FormControl, InputLabel, OutlinedInput, InputAdornment } from '@mui/material'
import BtcIcon from '@/components/icon/BtcIcon'
import CopyButton from '@/components/atom/CopyButton'

interface IAmountInput {
  readOnly: boolean
  value: string
  onChange: (e: ChangeEvent<HTMLInputElement>) => void
}

const AmountInput = ({ readOnly, value, onChange }: IAmountInput) => {
  return (
    <FormControl fullWidth>
      <InputLabel htmlFor="outlined-adornment-amount">BitCoin</InputLabel>
      <OutlinedInput
        label="Amount"
        className="crypto-input"
        readOnly={readOnly}
        value={value}
        type="number"
        slotProps={{ input: { min: 0, step: 0.1, inputMode: 'decimal', pattern: '[0-9]+([.,]0|[1-9]+)?' } }}
        onChange={onChange}
        startAdornment={
          <InputAdornment position="start">
            <BtcIcon size={36} />
          </InputAdornment>
        }
        endAdornment={<CopyButton txt={value} />}
      />
    </FormControl>
  )
}

export default memo(AmountInput)
