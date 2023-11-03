import { ReactNode, memo } from 'react'
import { Typography } from '@mui/material'

interface IPageSubTitle {
  subTitle: string | ReactNode
}

const PageSubTitle = ({ subTitle }: IPageSubTitle) => {
  return (
    <Typography variant="h3" fontSize={20} fontWeight="bold" display="flex" justifyContent="flex-start" alignItems="center" gap={0.5} mt={3} mb={2}>
      📌 {subTitle}
    </Typography>
  )
}

export default memo(PageSubTitle)
