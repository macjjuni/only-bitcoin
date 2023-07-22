import { useMemo } from 'react'
import { Stack, Chip } from '@mui/material'

const ChipItem = ({ label, value }: { label: string; value: string }) => {
  const generateLabel = useMemo(() => {
    return (
      <Stack flexDirection="row" gap="5px">
        <span className="price-txt-xs">{label}</span>
        <span className="price-txt-xs" style={{ textShadow: '1px 1px 1px #d0d0d0' }}>
          {value}
        </span>
      </Stack>
    )
  }, [value])

  return <Chip className="chip-txt" label={generateLabel} variant="outlined" size="small" sx={{ borderRadius: 0 }} />
}

export default ChipItem
