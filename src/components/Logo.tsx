import { Box } from '@mui/material'
import Lottie, { LottieProps } from 'react-lottie-player'
import logo from '@/assets/logo.json'

// Lottie Option
const defaultOptions: LottieProps = { loop: true, play: true, style: { width: '36px', height: '36px' } }

const Logo = () => {
  return (
    <Box sx={{ display: 'flex', cursor: 'pointer' }}>
      <Lottie {...defaultOptions} animationData={logo} speed={3} />
    </Box>
  )
}

export default Logo
