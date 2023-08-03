import { useMemo } from 'react'
import { Stack, Chip, useMediaQuery } from '@mui/material'
import { responsive } from '@/styles/style'

interface IChip {
  label: string
  value: string
  onClick?: () => void
}

const ChipItem = ({ label, value, onClick }: IChip) => {
  const isSmall = useMediaQuery(`(max-width: ${responsive.mobile}px)`)

  const generateLabel = useMemo(() => {
    return (
      <Stack flexDirection="row" gap="5px" onClick={onClick} sx={{ cursor: 'pointer' }}>
        <span>{label}</span>
        <span style={{ textShadow: '1px 1px 1px #d0d0d0' }}>{value}</span>
      </Stack>
    )
  }, [value])

  return <Chip className="chip-txt" label={generateLabel} variant="outlined" size={isSmall ? 'small' : 'medium'} sx={{ borderRadius: 0, fontSize: isSmall ? '13px' : '18px' }} />
}

export default ChipItem
