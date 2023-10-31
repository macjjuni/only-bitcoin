import { memo, useState, useCallback } from 'react'
import { Stack, Typography } from '@mui/material'
import CubeLottie from './components/CubeLottie'
import PopOver from './components/PopOver'
import { IBlock } from '@/zustand/type'

const BlockView = ({ blockData }: { blockData: IBlock }) => {
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null)
  const handlePopoverOpen = useCallback((e: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(e.currentTarget)
  }, [])

  const handlePopoverClose = useCallback(() => {
    setAnchorEl(null)
  }, [])

  const open = Boolean(anchorEl)

  /**
   * Todo List
   * 📌 - 큐브 로티 따로 컴포넌트 분리
   * 📌 - Popover 컴포넌트 분리
   */

  return (
    <Stack mb="-60px" display="flex" flexDirection="row" justifyContent="flex-end" alignItems="center" maxWidth="400px" width="100%">
      <Stack
        position="relative"
        height="48px"
        display="flex"
        flexDirection="row"
        justifyContent="flex-end"
        alignItems="center"
        gap="8px"
        onMouseEnter={handlePopoverOpen}
        onMouseLeave={handlePopoverClose}
      >
        <CubeLottie />
        <Typography fontSize={20} fontWeight="bold" letterSpacing="0.64px" mr="8px">
          {blockData.height}
        </Typography>
      </Stack>
      <PopOver anchorEl={anchorEl} open={open} handlePopoverClose={handlePopoverClose} />
    </Stack>
  )
}

export default memo(BlockView)
