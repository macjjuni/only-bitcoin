import { ChangeEvent, memo } from 'react'
import { FormControlLabel, Switch } from '@mui/material'

interface ISwitch {
  label: string
  value: boolean
  onChange: (e: ChangeEvent<HTMLInputElement>) => void
}

const PriceStandardSwitch = ({ label, value, onChange }: ISwitch) => {
  return <FormControlLabel control={<Switch aria-label="price stardard" value={value} onChange={onChange} />} label={label} />
}

export default memo(PriceStandardSwitch)
