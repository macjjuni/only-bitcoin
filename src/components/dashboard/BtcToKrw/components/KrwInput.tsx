import { ChangeEvent, useMemo } from 'react'
import { Stack, FormControl, InputLabel, OutlinedInput, InputAdornment } from '@mui/material'
import CopyButton from '@/components/atom/CopyButton'
import KrwIcon from '@/components/icon/KrwIcon'

interface IKrwInput {
  value: string
  readOnly: boolean
  onChange: (e: ChangeEvent<HTMLInputElement>) => void
  standard: boolean
}

// 자주 렌더링 되므로 메모이제이션 X

const KrwInput = ({ value, readOnly, onChange, standard }: IKrwInput) => {
  const isFocused = useMemo(() => {
    return standard ? 'Mui-focused' : ''
  }, [standard])

  return (
    <FormControl fullWidth>
      <InputLabel htmlFor="outlined-adornment-amount" className={isFocused}>
        KRW
      </InputLabel>
      <OutlinedInput
        label="KRW"
        className={`input-center ${isFocused}`}
        readOnly={readOnly}
        value={value}
        onChange={onChange}
        startAdornment={
          <InputAdornment position="start">
            <Stack justifyContent="center" alignItems="center" width="36px">
              <KrwIcon size={24} />
            </Stack>
          </InputAdornment>
        }
        endAdornment={<CopyButton txt={value} />}
      />
    </FormControl>
  )
}

export default KrwInput
