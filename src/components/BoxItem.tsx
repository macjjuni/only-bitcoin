import { Box, Typography, Stack } from '@mui/material'

interface IBoxItem {
  icon: JSX.Element
  title: string
  children: React.ReactNode
}

const BoxItem = ({ icon, title, children }: IBoxItem) => {
  return (
    <Box className="box-item">
      <Typography variant="h2" fontSize={20} fontWeight="bold" align="left" pb={1} mb={1} borderBottom="1px solid #cbcbcb">
        <Stack flexDirection="row" alignItems="center" gap={1}>
          <Box height="24px">{icon}</Box>
          <Box height="100%">{title}</Box>
        </Stack>
      </Typography>
      {children}
    </Box>
  )
}
export default BoxItem
