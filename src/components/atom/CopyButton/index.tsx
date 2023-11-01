import { memo, useCallback } from 'react'
import IconButton from '@mui/material/IconButton'
import ContentCopyIcon from '@mui/icons-material/ContentCopy'
import { toast } from 'react-toastify'
import { copyText } from '@/utils/common'
import { btcInfo } from '@/data/btcInfo'

interface ICopy {
  txt: string
}

const CopyButton = ({ txt }: ICopy) => {
  const clickCopy = useCallback(async () => {
    if (!txt) return
    const target = txt.toString()
    const isDone = await copyText(target)
    if (isDone) toast.success(`"${txt}" 복사 완료!`)
    else toast.error('복사 실패!')
  }, [])

  return (
    <IconButton onClick={clickCopy} aria-label="copy" sx={{ color: btcInfo.color }}>
      <ContentCopyIcon fontSize="small" />
    </IconButton>
  )
}

export default memo(CopyButton)
