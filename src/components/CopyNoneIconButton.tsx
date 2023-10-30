import { memo } from 'react'
import { Box } from '@mui/material'
import { toast } from 'react-toastify'
import { copyText } from '@/utils/common'

interface ICopy {
  txt: string | number
}

const CopyButton = ({ txt }: ICopy) => {
  const clickCopy = async () => {
    if (!txt) return
    const target = txt.toString()
    const isDone = await copyText(target)
    if (isDone) toast.success(`"${txt}" 복사 완료!`)
    else toast.error('복사 실패!')
  }

  return (
    <Box onClick={clickCopy} aria-label="copy">
      {txt}
    </Box>
  )
}

export default memo(CopyButton)
