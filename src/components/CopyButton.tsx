import IconButton from '@mui/material/IconButton'

import ContentCopyIcon from '@mui/icons-material/ContentCopy'

const CopyButton = () => {
  return (
    <IconButton aria-label="copy" color="primary">
      <ContentCopyIcon fontSize="small" />
    </IconButton>
  )
}

export default CopyButton
