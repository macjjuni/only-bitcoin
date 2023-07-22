import { Outlet } from 'react-router'
import { ThemeProvider } from '@mui/material/styles'
import { ToastContainer } from 'react-toastify'

import CssBaseline from '@mui/material/CssBaseline'
import Header from '@/layout/header'
import Main from '@/layout/main'
import Footer from '@/layout/footer'
import GoogleGA from './components/GoogleGA'

import { darkTheme, lightTheme } from './styles/theme'
import { useBearStore } from './zustand/store'
import { toastProps } from '@/data/toast'

const toastOptions = toastProps()

const App = () => {
  const theme = useBearStore((state) => state.theme)
  GoogleGA()
  return (
    <ThemeProvider theme={theme === 'light' ? lightTheme : darkTheme}>
      <div id="only-bitcoin">
        <CssBaseline />
        <Header />
        <Main>
          <Outlet />
        </Main>
        <Footer />
        <ToastContainer {...toastOptions} />
      </div>
    </ThemeProvider>
  )
}

export default App
