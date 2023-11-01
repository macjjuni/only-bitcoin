import { memo, useCallback } from 'react'
import { IconButton } from '@mui/material'
import { IoMdRefresh } from 'react-icons/io'
import { btcInfo } from '@/data/btcInfo'

const RefreshButton = () => {
  const onRefresh = useCallback(() => {
    window.location.reload()
  }, [])

  return (
    <IconButton onClick={onRefresh} sx={{ width: '32px', height: '32px', padding: '0', margin: '0' }}>
      <IoMdRefresh fontSize={36} color={btcInfo.color} />
    </IconButton>
  )
}

export default memo(RefreshButton)
