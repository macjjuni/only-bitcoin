import { memo } from 'react'
import { ToggleButton, ToggleButtonGroup, Typography } from '@mui/material'
import { btcInfo, upbitAsset } from '@/data/btcInfo'

interface IToggleGroup {
  select: string | null
  setSelect: React.Dispatch<React.SetStateAction<string | null>>
}

const ToggleGroup = ({ select, setSelect }: IToggleGroup) => {
  // 탭메뉴 변경
  const handleSelect = (e: React.MouseEvent<HTMLElement>, next: string) => {
    if (next === null || next === select) return
    setSelect(next)
  }

  return (
    <ToggleButtonGroup exclusive aria-label="text alignment" value={select} onChange={handleSelect}>
      {upbitAsset.map((tab) => (
        <ToggleButton key={tab} value={tab} sx={{ width: '100%' }}>
          <Typography ml={1.5} fontWeight="bold" fontSize="large" color={btcInfo.color}>
            {tab}
          </Typography>
        </ToggleButton>
      ))}
    </ToggleButtonGroup>
  )
}
export default memo(ToggleGroup)
