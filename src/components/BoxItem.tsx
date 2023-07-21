import { Card, Box, Typography, Stack } from '@mui/material'

interface IBoxItem {
  icon?: JSX.Element
  title?: string
  height?: string
  noShadow?: boolean
  noBg?: boolean
  children: React.ReactNode
}

const BoxItem = ({ icon, title, height, noShadow, noBg, children }: IBoxItem) => {
  return (
    <Card className={`box-item ${noShadow ? 'no-shadow' : ''} ${noBg ? 'no-bg' : ''}`} sx={{ padding: '12px', boxShadow: 'none', height: height || 'auto' }}>
      {title && (
        <Typography className="box-title" variant="h2" fontSize={20} fontWeight="bold" pb="12px" mb="12px" borderBottom="1px solid #efefef">
          <Stack flexDirection="row" alignItems="center" gap={1}>
            <Box height="24px">{icon}</Box>
            <Box height="100%">{title}</Box>
          </Stack>
        </Typography>
      )}
      {children}
    </Card>
  )
}
export default BoxItem
