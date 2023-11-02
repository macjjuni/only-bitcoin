import { Container } from '@mui/material'
import { layout } from '@/styles/style'

const Main = ({ children }: { children: JSX.Element }) => {
  return (
    <Container component="main" className="main" sx={{ minHeight: `calc(100dvh - ${layout.main}px)` }}>
      {children}
    </Container>
  )
}

export default Main
