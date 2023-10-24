import { Typography, Button, Stack } from '@mui/material'
import { useNavigate } from 'react-router-dom'

import { type LottieProps } from 'react-lottie-player'
import LottieItem from '@/components/LottieItem'
import Bitcoin404 from '@/assets/404-bitcoin.json'

const defaultOption: LottieProps = { loop: true, play: true }
const lottieOption = { ...defaultOption, style: { width: 'auto', height: '150px' } }

const Error = () => {
  const navigate = useNavigate()

  return (
    <Stack className="error-page">
      <Typography component="h1" align="center" fontSize={34} fontWeight="bold">
        <LottieItem play option={lottieOption} animationData={Bitcoin404} speed={1} />
      </Typography>
      <Stack flexDirection="row" justifyContent="center" py={4}>
        <Button
          variant="contained"
          color="secondary"
          sx={{ width: '120px' }}
          onClick={() => {
            navigate('/')
          }}
        >
          Go Home
        </Button>
      </Stack>
    </Stack>
  )
}

export default Error
