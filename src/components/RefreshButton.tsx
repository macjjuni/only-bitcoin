import { memo } from 'react'
import { IconButton } from '@mui/material'
import { IoMdRefresh } from 'react-icons/io'
import { btcInfo } from '@/data/btcInfo'

const RefreshButton = () => {
  const onRefresh = () => {
    window.location.reload()
  }

  return (
    <IconButton onClick={onRefresh} sx={{ width: '48px', padding: '0', margin: '0' }}>
      <IoMdRefresh fontSize={42} color={btcInfo.color} />
    </IconButton>
  )
}

export default memo(RefreshButton)
