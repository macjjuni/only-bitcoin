import { Typography, Button, Stack } from '@mui/material'
import { useNavigate } from 'react-router-dom'

const Error = () => {
  const navigate = useNavigate()

  return (
    <>
      <Typography component="h1" align="center" fontSize={34} fontWeight="bold" pt="200px">
        Not Found Page
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
    </>
  )
}

export default Error
