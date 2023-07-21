import { Chip } from '@mui/material'

const ChipItem = ({ text }: { text: string }) => {
  return <Chip className="chip-txt" label={text} variant="outlined" size="small" sx={{ borderRadius: 0 }} />
}

export default ChipItem
