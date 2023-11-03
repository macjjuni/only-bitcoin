import { ReactNode, memo } from 'react'
import { Typography, Divider, useMediaQuery } from '@mui/material'
import { responsive } from '@/styles/style'
import BtcIcon from '@/components/icon/BtcIcon'

interface IPageTitle {
  title: string | ReactNode
}

const PageTitle = ({ title }: IPageTitle) => {
  const matches = useMediaQuery(`(min-width: ${responsive.mobile}px)`)

  return (
    <>
      <Typography variant="h2" fontSize={24} fontWeight="bold" display="flex" justifyContent="flex-start" alignItems="center" gap="4px" mt={matches ? 4 : 2} mb={1.5}>
        <BtcIcon size={24} />
        {title}
      </Typography>
      <Divider sx={{ mb: 1.5 }} />
    </>
  )
}

export default memo(PageTitle)
