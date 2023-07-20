import { Box } from '@mui/material'

const BoxItem = ({ children }: { children: React.ReactNode }) => {
  return <Box className="box-item">{children}</Box>
}
export default BoxItem
